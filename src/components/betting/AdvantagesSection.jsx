import { useState, useEffect } from 'react'
import { ShoppingCart, Clock } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'

export default function AdvantagesSection({ playerId, pulpBalance, onPurchase }) {
  const [catalog, setCatalog] = useState([])
  const [activeAdvantages, setActiveAdvantages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch advantage catalog
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

  // Fetch player's active advantages
  useEffect(() => {
    async function fetchActiveAdvantages() {
      if (!playerId) return

      try {
        const { data, error } = await supabase
          .from('registered_players')
          .select('active_advantages')
          .eq('id', playerId)
          .single()

        if (error) throw error

        // Filter only active (not used, not expired)
        const now = new Date()
        const active = (data.active_advantages || []).filter(
          adv => !adv.used_at && new Date(adv.expires_at) > now
        )
        setActiveAdvantages(active)
      } catch (err) {
        console.error('Error fetching active advantages:', err)
      }
    }

    fetchActiveAdvantages()
  }, [playerId])

  const handlePurchase = async (advantageKey, cost) => {
    setError(null)
    setSuccess(null)

    if (cost > pulpBalance) {
      setError('Insufficient PULPs')
      return
    }

    // Check if already owns this advantage
    const hasActive = activeAdvantages.some(adv => adv.advantage_key === advantageKey)
    if (hasActive) {
      setError('You already have an active advantage of this type')
      return
    }

    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch('/api/pulp/purchaseAdvantage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ advantageKey })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase advantage')
      }

      setSuccess(`${result.catalogEntry.name} purchased! Expires in 24 hours.`)
      setActiveAdvantages(prev => [...prev, result.advantage])
      onPurchase(cost)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (iconName) => {
    const icons = {
      'RotateCcw': '🔄',
      'Ban': '🚫',
      'X': '❌',
      'Backpack': '🎒',
      'Beer': '🍺'
    }
    return icons[iconName] || '⭐'
  }

  return (
    <div className="space-y-6">
      {/* Active Advantages */}
      {activeAdvantages.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-green-600">Your Active Advantages</h3>
          <div className="space-y-2">
            {activeAdvantages.map((adv, idx) => {
              const catalogEntry = catalog.find(c => c.advantage_key === adv.advantage_key)
              const expiresAt = new Date(adv.expires_at)
              const hoursLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60))

              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {getIconComponent(catalogEntry?.icon)} {catalogEntry?.name || adv.advantage_key}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {hoursLeft}h left
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Advantage Rules</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>24hr expiry</li>
          <li>One per type</li>
          <li>Use any round</li>
          <li>Unused = lost on expiry</li>
        </ul>
      </div>

      {/* Catalog */}
      <div className="space-y-3">
        <h3 className="font-semibold">Available Advantages</h3>
        {catalog.map(advantage => {
          const hasActive = activeAdvantages.some(adv => adv.advantage_key === advantage.advantage_key)

          return (
            <div
              key={advantage.advantage_key}
              className="border border-border rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{getIconComponent(advantage.icon)}</span>
                  <h4 className="font-semibold">{advantage.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {advantage.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires in {advantage.expiration_hours} hours
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-lg font-bold text-primary">
                  {advantage.pulp_cost} PULPs
                </span>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(advantage.advantage_key, advantage.pulp_cost)}
                  disabled={loading || hasActive || advantage.pulp_cost > pulpBalance}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  {hasActive ? 'Owned' : 'Buy'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 text-green-600 rounded-lg p-3 text-sm">
          {success}
        </div>
      )}
    </div>
  )
}
