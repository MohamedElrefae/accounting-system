# AI Model Comparison Test Case: Budget Allocation & Variance Analysis

## Overview
This test case will help compare GPT-5 Low Reasoning vs Claude 4 Sonnet for coding tasks in your accounting system.

## Task Description
Create a complete Budget Allocation system with the following components:

### 1. Database Schema Design
- Design tables for budgets, budget periods, and budget allocations
- Create proper relationships with existing expense categories
- Include proper indexing and constraints

### 2. Backend API Services
- CRUD operations for budget management
- Variance calculation functions
- Budget period management
- Integration with existing expense categories system

### 3. Frontend Components
- Budget creation/editing form
- Budget allocation tree view (similar to expense categories)
- Variance analysis dashboard with charts
- Budget vs actual comparison tables
- Export functionality for budget reports

### 4. Business Logic Requirements
- Support multiple budget periods (annual, quarterly, monthly)
- Calculate variances (absolute and percentage)
- Handle budget rollover between periods
- Support budget approval workflows
- Alert system for budget overruns

## Evaluation Criteria

### Technical Quality (40%)
- Code structure and organization
- TypeScript usage and type safety
- Error handling and validation
- Performance considerations
- Security best practices

### Integration Quality (25%)
- How well it integrates with existing codebase
- Follows established patterns
- Proper use of existing services
- Database relationship design

### Completeness (20%)
- All requirements addressed
- Edge cases handled
- Proper testing considerations
- Documentation quality

### Efficiency (15%)
- Speed of development
- Number of iterations needed
- Quality of initial code
- Minimal back-and-forth needed

## Testing Process

### Phase 1: Database Design
Ask each model to design the database schema with proper SQL scripts.

### Phase 2: API Development
Request TypeScript services following existing patterns.

### Phase 3: Frontend Components
Create React components with Material-UI following your design system.

### Phase 4: Integration Testing
Request integration code and testing strategies.

### Phase 5: Refinement
Test how well each model handles bug fixes and feature enhancements.

## Success Metrics
- Time to working prototype
- Code quality and maintainability  
- Adherence to project conventions
- Handling of complex business logic
- Integration smoothness

## Files to Create/Modify
1. Database migration scripts
2. `/src/types/budgets.ts`
3. `/src/services/budgets.ts`
4. `/src/components/BudgetAllocationView.tsx`
5. `/src/components/VarianceAnalysisDashboard.tsx`
6. `/src/pages/BudgetManagement.tsx`
7. Additional utility and helper files as needed

## Next Steps
1. Start with Claude 4 Sonnet (this conversation)
2. Document the approach, time, and quality
3. Switch to GPT-5 Low Reasoning for the same task
4. Compare results across all criteria
