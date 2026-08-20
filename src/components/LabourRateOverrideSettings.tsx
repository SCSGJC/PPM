import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Save } from 'lucide-react';
import { labourRatesService, LabourRate } from '../services/labourRatesService';
import { labourRateOverrideService } from '../services/labourRateOverrideService';
import { LabourRateOverride } from '../types/maintenance';
import { useToast } from '../context/ToastContext';

interface LabourRateOverrideSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | null;
  onOverridesUpdated?: () => void;
}

interface RateWithOverride extends LabourRate {
  hasOverride: boolean;
  displayRate: number;
}

export const LabourRateOverrideSettings: React.FC<LabourRateOverrideSettingsProps> = ({
  isOpen,
  onClose,
  proposalId,
  onOverridesUpdated,
}) => {
  const [rates, setRates] = useState<RateWithOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && proposalId) {
      loadRatesWithOverrides();
    }
  }, [isOpen, proposalId]);

  const loadRatesWithOverrides = async () => {
    if (!proposalId) return;

    setLoading(true);

    const [standardRatesResult, overridesResult] = await Promise.all([
      labourRatesService.getLabourRates(),
      labourRateOverrideService.getOverridesForProposal(proposalId),
    ]);

    if (standardRatesResult.error) {
      showToast('Failed to load labour rates', 'error');
      setLoading(false);
      return;
    }

    if (overridesResult.error) {
      showToast('Failed to load overrides', 'error');
      setLoading(false);
      return;
    }

    const standardRates = standardRatesResult.data || [];
    const overrides = overridesResult.data || [];

    const overrideMap = new Map<string, number>();
    overrides.forEach(override => {
      overrideMap.set(override.labour_rate_id, override.override_rate);
    });

    const ratesWithOverrides: RateWithOverride[] = standardRates.map(rate => ({
      ...rate,
      hasOverride: overrideMap.has(rate.id),
      displayRate: overrideMap.get(rate.id) || rate.base_rate,
    }));

    setRates(ratesWithOverrides);
    setLoading(false);
  };

  const handleRateChange = (rateId: string, value: number) => {
    setRates(rates.map(rate => {
      if (rate.id === rateId) {
        return {
          ...rate,
          displayRate: value,
          hasOverride: value !== rate.base_rate,
        };
      }
      return rate;
    }));
  };

  const handleResetRate = (rateId: string) => {
    setRates(rates.map(rate => {
      if (rate.id === rateId) {
        return {
          ...rate,
          displayRate: rate.base_rate,
          hasOverride: false,
        };
      }
      return rate;
    }));
  };

  const handleResetAll = () => {
    if (!confirm('Reset all labour rates to standard values?')) {
      return;
    }

    setRates(rates.map(rate => ({
      ...rate,
      displayRate: rate.base_rate,
      hasOverride: false,
    })));
  };

  const handleSave = async () => {
    if (!proposalId) return;

    setSaving(true);

    try {
      await labourRateOverrideService.clearAllOverrides(proposalId);

      for (const rate of rates) {
        if (rate.hasOverride && rate.displayRate !== rate.base_rate) {
          const { error } = await labourRateOverrideService.setOverride(
            proposalId,
            rate.id,
            rate.displayRate
          );

          if (error) {
            throw new Error(`Failed to save override for ${rate.name}`);
          }
        }
      }

      showToast('Labour rate overrides saved successfully', 'success');
      onOverridesUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error saving labour rate overrides:', error);
      showToast('Failed to save labour rate overrides', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Project Labour Rate Overrides</h2>
            <p className="text-sm text-gray-600 mt-1">
              Customize labour rates for this project. Changes only apply to this proposal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-700 px-2 pb-2 border-b">
                <div className="col-span-5">Labour Type</div>
                <div className="col-span-3">Standard Rate (£/hr)</div>
                <div className="col-span-3">Project Rate (£/hr)</div>
                <div className="col-span-1"></div>
              </div>

              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors ${
                    rate.hasOverride ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="col-span-5 font-medium text-gray-800">
                    {rate.name}
                    {rate.hasOverride && (
                      <span className="ml-2 text-xs text-amber-600 font-semibold">OVERRIDDEN</span>
                    )}
                  </div>
                  <div className="col-span-3 text-gray-600">
                    £{rate.base_rate.toFixed(2)}
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={rate.displayRate}
                      onChange={(e) => handleRateChange(rate.id, parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        rate.hasOverride
                          ? 'border-amber-300 focus:ring-amber-500'
                          : 'border-gray-300 focus:ring-green-500'
                      }`}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {rate.hasOverride && (
                      <button
                        onClick={() => handleResetRate(rate.id)}
                        className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                        title="Reset to standard rate"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleResetAll}
            disabled={saving || loading || !rates.some(r => r.hasOverride)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Overrides'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
