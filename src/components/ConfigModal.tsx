/**
 * ConfigModal - Settings modal for runtime configuration.
 * Allows manual editing of physics, visual, spawn, and generation settings.
 */

import { useState, useCallback } from 'react'
import type { RuntimeConfig, ModelType } from '@/types/runtimeConfig'
import './ConfigModal.css'

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
  config: RuntimeConfig
  onSave: (config: RuntimeConfig) => void
}

export default function ConfigModal({
  isOpen,
  onClose,
  config,
  onSave,
}: ConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<RuntimeConfig>(config)

  // Update local config when prop changes
  const resetToProps = useCallback(() => {
    setLocalConfig(config)
  }, [config])

  if (!isOpen) return null

  const updatePhysics = (
    key: keyof RuntimeConfig['physics'],
    value: number
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      physics: { ...prev.physics, [key]: value },
    }))
  }

  const updateVisual = (
    key: keyof RuntimeConfig['visual'],
    value: string | number
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      visual: { ...prev.visual, [key]: value },
    }))
  }

  const updateSpawn = (
    key: keyof RuntimeConfig['spawn'],
    value: number | RuntimeConfig['spawn']['spawnRegion']
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      spawn: { ...prev.spawn, [key]: value },
    }))
  }

  const updateSpawnRegion = (
    key: keyof RuntimeConfig['spawn']['spawnRegion'],
    value: number
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      spawn: {
        ...prev.spawn,
        spawnRegion: { ...prev.spawn.spawnRegion, [key]: value },
      },
    }))
  }

  const updateGeneration = (
    key: keyof RuntimeConfig['generation'],
    value: number | ModelType
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      generation: { ...prev.generation, [key]: value },
    }))
  }

  const handleSave = () => {
    onSave(localConfig)
    onClose()
  }

  const handleCancel = () => {
    resetToProps()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="config-body">
          {/* Physics Section */}
          <section className="config-section">
            <h3>Physics</h3>

            <div className="config-row">
              <label>Fade Duration</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="5000"
                  max="120000"
                  step="1000"
                  value={localConfig.physics.fadeDuration}
                  onChange={(e) =>
                    updatePhysics('fadeDuration', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {Math.round(localConfig.physics.fadeDuration / 1000)}s
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Drift Speed</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={localConfig.physics.driftSpeed}
                  onChange={(e) =>
                    updatePhysics('driftSpeed', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {localConfig.physics.driftSpeed.toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Damping</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0.9"
                  max="1"
                  step="0.001"
                  value={localConfig.physics.damping}
                  onChange={(e) =>
                    updatePhysics('damping', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {localConfig.physics.damping.toFixed(3)}
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Jiggle Intensity</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={localConfig.physics.jiggleIntensity}
                  onChange={(e) =>
                    updatePhysics('jiggleIntensity', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {localConfig.physics.jiggleIntensity.toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Bounce Elasticity</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localConfig.physics.bounceElasticity}
                  onChange={(e) =>
                    updatePhysics('bounceElasticity', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {localConfig.physics.bounceElasticity.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          {/* Visual Section */}
          <section className="config-section">
            <h3>Visual</h3>

            <div className="config-row">
              <label>Card Style</label>
              <select
                value={localConfig.visual.cardStyle}
                onChange={(e) => updateVisual('cardStyle', e.target.value)}
              >
                <option value="glass">Glass</option>
                <option value="minimal">Minimal</option>
                <option value="paper">Paper</option>
                <option value="outlined">Outlined</option>
              </select>
            </div>

            <div className="config-row">
              <label>Typography</label>
              <select
                value={localConfig.visual.typography}
                onChange={(e) => updateVisual('typography', e.target.value)}
              >
                <option value="serif">Serif</option>
                <option value="sans">Sans-serif</option>
                <option value="mono">Monospace</option>
              </select>
            </div>

            <div className="config-row">
              <label>Accent Color</label>
              <div className="config-input-group">
                <input
                  type="color"
                  value={localConfig.visual.accent}
                  onChange={(e) => updateVisual('accent', e.target.value)}
                />
                <span className="config-value">
                  {localConfig.visual.accent}
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Card Opacity</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={localConfig.visual.cardOpacityMax}
                  onChange={(e) =>
                    updateVisual('cardOpacityMax', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {(localConfig.visual.cardOpacityMax * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </section>

          {/* Spawn Section */}
          <section className="config-section">
            <h3>Spawn</h3>

            <div className="config-row">
              <label>Initial Velocity</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={localConfig.spawn.initialVelocityRange}
                  onChange={(e) =>
                    updateSpawn('initialVelocityRange', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {localConfig.spawn.initialVelocityRange.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Spawn X Range</label>
              <div className="config-input-group dual">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localConfig.spawn.spawnRegion.xMin}
                  onChange={(e) =>
                    updateSpawnRegion('xMin', Number(e.target.value))
                  }
                />
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localConfig.spawn.spawnRegion.xMax}
                  onChange={(e) =>
                    updateSpawnRegion('xMax', Number(e.target.value))
                  }
                />
                <span className="config-value">%</span>
              </div>
            </div>

            <div className="config-row">
              <label>Spawn Y Range</label>
              <div className="config-input-group dual">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localConfig.spawn.spawnRegion.yMin}
                  onChange={(e) =>
                    updateSpawnRegion('yMin', Number(e.target.value))
                  }
                />
                <span>-</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localConfig.spawn.spawnRegion.yMax}
                  onChange={(e) =>
                    updateSpawnRegion('yMax', Number(e.target.value))
                  }
                />
                <span className="config-value">%</span>
              </div>
            </div>
          </section>

          {/* Generation Section */}
          <section className="config-section">
            <h3>Generation</h3>

            <div className="config-row">
              <label>Card Threshold</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={localConfig.generation.cardCountThreshold}
                  onChange={(e) =>
                    updateGeneration(
                      'cardCountThreshold',
                      Number(e.target.value)
                    )
                  }
                />
                <span className="config-value">
                  &lt; {localConfig.generation.cardCountThreshold} cards
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Generation Interval</label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="2000"
                  max="30000"
                  step="1000"
                  value={localConfig.generation.intervalMs}
                  onChange={(e) =>
                    updateGeneration('intervalMs', Number(e.target.value))
                  }
                />
                <span className="config-value">
                  {Math.round(localConfig.generation.intervalMs / 1000)}s
                </span>
              </div>
            </div>

            <div className="config-row">
              <label>Model</label>
              <select
                value={localConfig.generation.model}
                onChange={(e) =>
                  updateGeneration('model', e.target.value as ModelType)
                }
              >
                <option value="pro">Gemini 3 Pro (recommended)</option>
              </select>
            </div>
          </section>
        </div>

        <div className="config-footer">
          <button className="config-btn secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="config-btn primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
