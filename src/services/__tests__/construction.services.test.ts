// Placeholder tests for construction services (requires test runner)
import { ConstructionProgressIntegration } from '../../services/ConstructionProgressIntegration'
import { ConstructionComplianceManager } from '../../services/ConstructionComplianceManager'
import { ConstructionCostAllocation } from '../../services/ConstructionCostAllocation'

describe('Construction Services', () => {
  it('exposes list/get methods (placeholder)', () => {
    expect(typeof ConstructionProgressIntegration.getPhaseProgress).toBe('function')
    expect(typeof ConstructionComplianceManager.listCompliance).toBe('function')
    expect(typeof ConstructionCostAllocation.listSubcontractors).toBe('function')
    expect(typeof ConstructionCostAllocation.listMaterials).toBe('function')
  })
})