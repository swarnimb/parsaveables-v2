import { useState, useEffect } from 'react'
import { ShoppingCart, Clock } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

/**
 * AdvantagesSection — buy advantages during an open PULPy window.
 *
 * Available: Mulligan (150), Bag Trump (80), Shotgun Buddy (80)
 * Expire: 11:59 PM on the day of purchase
 * Gate: window must be 'open' to purchase
 */
export default function AdvantagesSection({ playerId, pulpBalance, window, onPurchase }) {
  const { toast } = useToast()
  const [catalog, setCatalog] = useState([])
  const [activeAdvantages, setActiveAdvantages] = useState([])
  const [loading, setLoading] = useState(false)

  const windowOpen = window?.status === 'open'
  const windowId = window?.id

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const { data, error } = await supabase
          .from('advantage_catalog')
          .select('*')
          .order('pulp_cost', { ascending: true })

        if (error) throw error
        setCatalog(data || [])
      } catch (err) {
        console.error('Error fetching catalog:', err)
      }
    }

    fetchCatalog()
  }, [])

  useEffect(() => {
    async function fetchActive() {
      if (!playerId) return

      try {
        const { data, error } = await supabase
          .from('registered_players')
          .select('active_advantages')
          .eq('id', playerId)
          .single()

        if (error) throw error

        const now = new Date()
        const active = (data.active_advantages || []).filter(
          adv => !adv.used_at && new Date(adv.expires_at) > now
        )
        setActiveAdvantages(active)
      } catch (err) {
        console.error('Error fetching active advantages:', err)
      }
    }

    fetchActive()
  }, [playerId])

  const handlePurchase = async (advantageKey, cost, name) => {
    if (cost > pulpBalance) {
      toast({ variant: 'destructive', title: 'Insufficient PULPs', description: `Need ${cost}, have ${pulpBalance}` })
      return
    }

    if (activeAdvantages.some(a => a.advantage_key === advantageKey)) {
      toast({ variant: 'destructive', title: 'Already Owned', description: 'You already have an active advantage of this type' })
      return
    }

    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/pulp/purchaseAdvantage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ advantageKey, windowId })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to purchase')

      setActiveAdvantages(prev => [...prev, result.advantage])
      onPurchase(cost)

      toast({
        title: `${name} Purchased!`,
        description: 'Expires at 11:59 PM tonight'
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Purchase Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const iconMap = { RotateCcw: '🔄', Backpack: '🎒', Beer: '🍺' }
  const getIcon = name => iconMap[name] || '⭐'

  return (
    <div className="space-y-4">
      {/* Active advantages */}
      {activeAdvantages.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-green-600">Your Active Advantages</h3>
          <div className="space-y-2">
            {activeAdvantages.map((adv, idx) => {
              const cat = catalog.find(c => c.advantage_key === adv.advantage_key)
              const expiresAt = new Date(adv.expires_at)
              const hoursLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60))
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getIcon(cat?.icon)} {cat?.name || adv.advantage_key}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {hoursLeft}h left
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!windowOpen && (
        <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
          <ShoppingCart className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Advantages available during open windows only</p>
        </div>
      )}

      {/* Catalog */}
      <div className="space-y-3">
        <h3 className="font-semibold">Available Advantages</h3>
        {catalog.map(adv => {
          const owned = activeAdvantages.some(a => a.advantage_key === adv.advantage_key)
          const canBuy = windowOpen && !owned && adv.pulp_cost <= pulpBalance

          return (
            <div key={adv.advantage_key} className="border border-border rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{getIcon(adv.icon)}</span>
                  <h4 className="font-semibold">{adv.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{adv.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-lg font-bold text-primary">{adv.pulp_cost} PULPs</span>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(adv.advantage_key, adv.pulp_cost, adv.name)}
                  disabled={loading || owned || !windowOpen || adv.pulp_cost > pulpBalance}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {owned ? 'Owned' : !windowOpen ? 'Locked' : 'Buy'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
