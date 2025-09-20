# Warp AI Agent Implementation Plan: Enterprise Document Management System

## Project Overview

**Objective**: Implement a comprehensive enterprise document management system for your construction accounting application using React TypeScript with unified upload functionality throughout the entire application.

**Technology Stack**:
- React TypeScript
- Supabase (Database + Storage)
- Tailwind CSS (UI Framework)
- React Query/TanStack Query (State Management)
- React Hook Form (Form Handling)
- Warp AI Agent (Development Assistant)

## Phase 1: Foundation & Core Infrastructure (Week 1-2)

### 1.1 Project Setup & Dependencies

**Warp AI Prompt for Setup**:
```bash
Set up a React TypeScript project with Supabase integration for document management. Include the following dependencies:
- @supabase/supabase-js
- @tanstack/react-query
- react-hook-form
- @hookform/resolvers/zod
- zod
- tailwindcss
- lucide-react (for icons)
- react-dropzone
- clsx and tailwind-merge for utility classes

Configure TypeScript with strict mode and create proper folder structure for a scalable enterprise application.
```

**Expected Project Structure**:
```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── document/             # Document-specific components
│   └── forms/                # Form components
├── hooks/                    # Custom hooks
├── services/                 # API services
├── types/                    # TypeScript definitions
├── utils/                    # Utility functions
├── contexts/                 # React contexts
└── pages/                    # Page components
```

### 1.2 Database Schema Implementation

**Warp AI Prompt for Database**:
```bash
Using the provided Supabase schema, create SQL migrations for the document management system. Implement these tables with proper indexes, RLS policies, and triggers:

1. document_categories (hierarchical structure)
2. documents (main entity with metadata)
3. document_versions (version control)
4. document_permissions (access control)
5. document_relationships (links to business entities)
6. document_audit_log (activity tracking)
7. document_templates (predefined templates)

Ensure Arabic language support and proper foreign key relationships to existing accounting tables.
```

**Deliverable**: SQL migration files and TypeScript types

### 1.3 Supabase Storage Configuration

**Warp AI Prompt for Storage**:
```bash
Configure Supabase Storage buckets for enterprise document management:

Buckets:
- documents-public (RLS: org members)
- documents-private (RLS: specific permissions)
- project-documents (RLS: project members)
- user-uploads (RLS: user-specific)

Create proper folder structure, CORS policies, and signed URL configuration for secure file access.
```

**Deliverable**: Storage policies and bucket configuration

## Phase 2: Core Document Management Components (Week 3-4)

### 2.1 Unified File Upload Component

**Warp AI Prompt for Upload Component**:
```bash
Create a comprehensive React TypeScript file upload component with these features:

Enterprise Requirements:
- Drag and drop functionality
- Multiple file selection
- Progress indicators with cancel ability
- File type validation (PDF, DOC, XLS, images, CAD files)
- File size restrictions (configurable)
- Preview thumbnails for images
- Metadata extraction (file size, type, creation date)
- Error handling with user-friendly messages
- Accessibility compliance (WCAG 2.1)
- Mobile-responsive design

Technical Specs:
- Use react-dropzone for drag/drop
- Implement chunked upload for large files
- Real-time progress updates
- Queue management for multiple uploads
- Integration with React Hook Form
- TypeScript interfaces for all props
- Tailwind CSS for styling
- Support for both controlled and uncontrolled modes

Props Interface:
- multiple?: boolean
- acceptedFileTypes?: string[]
- maxFileSize?: number
- onUploadComplete?: (files: UploadedFile[]) => void
- onUploadError?: (error: Error) => void
- organizationId: string
- projectId?: string
- categoryId?: string
- showPreview?: boolean
- disabled?: boolean
```

**Expected Component Structure**:
```typescript
interface UnifiedFileUploadProps {
  multiple?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: Error) => void;
  organizationId: string;
  projectId?: string;
  categoryId?: string;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: Date;
}
```

**Deliverable**: `UnifiedFileUpload.tsx` component with full functionality

### 2.2 Document Management Service Layer

**Warp AI Prompt for Services**:
```bash
Create a comprehensive TypeScript service layer for document management with these capabilities:

DocumentService class with methods:
- uploadDocument(file: File, metadata: DocumentMetadata): Promise<Document>
- getDocuments(filters: DocumentFilters): Promise<Document[]>
- getDocumentById(id: string): Promise<Document>
- updateDocument(id: string, updates: Partial<Document>): Promise<Document>
- deleteDocument(id: string): Promise<void>
- downloadDocument(id: string): Promise<Blob>
- createDocumentVersion(documentId: string, file: File): Promise<DocumentVersion>
- getDocumentVersions(documentId: string): Promise<DocumentVersion[]>
- setDocumentPermissions(documentId: string, permissions: Permission[]): Promise<void>
- searchDocuments(query: string, filters?: SearchFilters): Promise<Document[]>

Include proper error handling, retry logic, and TypeScript interfaces for all data structures.
Use Supabase client for database operations and storage interactions.
```

**Deliverable**: `documentService.ts` with complete CRUD operations

### 2.3 Document Categories Management

**Warp AI Prompt for Categories**:
```bash
Create a hierarchical document category management system:

Components needed:
1. CategoryTree - Display categories in tree structure
2. CategoryForm - Create/edit categories
3. CategorySelector - Multi-level dropdown for category selection

Features:
- Drag and drop category reordering
- Color coding and icons for visual identification
- Breadcrumb navigation
- Search and filter categories
- Bulk operations (move, delete multiple)
- Pre-defined construction industry categories

Integration with the unified upload component for automatic categorization.
```

**Deliverable**: Category management components with tree structure

## Phase 3: Advanced Features & Integration (Week 5-6)

### 3.1 Document Viewer Component

**Warp AI Prompt for Viewer**:
```bash
Create a universal document viewer component supporting multiple file types:

Supported Formats:
- PDF (pdf.js integration)
- Images (JPEG, PNG, GIF, WebP)
- Office documents (preview via iframe or conversion)
- Text files (syntax highlighting)
- CAD files (basic preview if possible)

Features:
- Zoom controls (fit to width, fit to page, custom zoom)
- Page navigation for multi-page documents
- Rotation controls
- Fullscreen mode
- Print functionality
- Download with watermark option
- Comments and annotations (basic)
- Mobile-responsive with touch gestures

Security:
- Respect document permissions
- Audit log integration for view tracking
- Watermarking for confidential documents
```

**Deliverable**: `DocumentViewer.tsx` with multi-format support

### 3.2 Integration with Existing Accounting System

**Warp AI Prompt for Integration**:
```bash
Create integration points between the document management system and existing accounting tables:

Integration Components:
1. TransactionDocuments - Link documents to accounting transactions
2. ProjectDocuments - Associate documents with projects
3. ContractDocuments - Manage contract-related documents
4. InvoiceDocuments - Attach invoices and receipts

Features:
- Automatic document suggestions based on transaction type
- Bulk document linking
- Document requirement templates (e.g., "Purchase Order requires: invoice, receipt, delivery note")
- Workflow triggers (e.g., "When invoice > $10k, require approval documents")
- Dashboard widgets showing document status for transactions

Create React hooks for each integration:
- useTransactionDocuments(transactionId)
- useProjectDocuments(projectId)
- useDocumentRequirements(entityType, entityId)
```

**Deliverable**: Integration components and hooks

### 3.3 Advanced Search & Filtering

**Warp AI Prompt for Search**:
```bash
Implement comprehensive search and filtering capabilities:

Search Features:
- Full-text search across document content (where possible)
- Metadata search (title, description, tags)
- Advanced filters (date ranges, file types, categories, projects, users)
- Saved search queries
- Search history
- Auto-suggestions and typo tolerance
- Arabic language search support

UI Components:
- SearchBar with auto-complete
- FilterPanel with collapsible sections
- SearchResults with sorting options
- SavedSearches management

Use PostgreSQL full-text search capabilities through Supabase.
Implement debounced search for performance.
```

**Deliverable**: Advanced search interface with filtering

## Phase 4: Enterprise Features (Week 7-8)

### 4.1 Document Approval Workflows

**Warp AI Prompt for Workflows**:
```bash
Create a document approval workflow system integrated with existing approval infrastructure:

Components:
1. WorkflowDesigner - Visual workflow builder
2. ApprovalQueue - Dashboard for pending approvals
3. WorkflowHistory - Audit trail of approval actions
4. NotificationCenter - Alerts for workflow actions

Features:
- Multi-step approval processes
- Conditional routing based on document properties
- Parallel and sequential approval paths
- Escalation rules for overdue approvals
- Email/SMS notifications
- Bulk approval capabilities
- Mobile-friendly approval interface

Integration with existing approval_workflows table structure.
```

**Deliverable**: Workflow management system

### 4.2 Document Templates & Automation

**Warp AI Prompt for Templates**:
```bash
Create a document template system for construction industry:

Template Types:
- Contract templates
- Invoice templates
- Report templates (daily, weekly, inspection)
- Compliance document templates
- Safety documentation templates

Features:
- Template designer with form fields
- Variable substitution (project data, company info)
- Automatic document generation from templates
- Template versioning and approval
- Template library with sharing capabilities
- Import/export templates

Components:
- TemplateDesigner
- TemplateLibrary
- DocumentGenerator
- TemplatePreview
```

**Deliverable**: Template system with automation

### 4.3 Analytics & Reporting Dashboard

**Warp AI Prompt for Analytics**:
```bash
Create comprehensive analytics dashboard for document management:

Metrics to Track:
- Document upload/access patterns
- Storage usage by category/project
- User activity and adoption rates
- Approval workflow performance
- Document compliance status
- Popular document types and categories

Visualization Components:
- Usage charts (line, bar, pie charts)
- Activity timeline
- Storage usage indicators
- Performance metrics cards
- Export capabilities (PDF, Excel)

Use chart.js or recharts for visualizations.
Implement real-time updates where appropriate.
```

**Deliverable**: Analytics dashboard

## Phase 5: Mobile & Performance Optimization (Week 9-10)

### 5.1 Mobile-Responsive Design

**Warp AI Prompt for Mobile**:
```bash
Optimize the entire document management system for mobile devices:

Mobile-Specific Features:
- Touch-optimized file upload (camera integration)
- Swipe gestures for document navigation
- Offline document access (service workers)
- Progressive Web App (PWA) capabilities
- Mobile document scanner integration
- GPS location tagging for field documents

Responsive Breakpoints:
- Mobile: 320px - 768px
- Tablet: 768px - 1024px
- Desktop: 1024px+

Ensure all components work seamlessly across all screen sizes.
```

**Deliverable**: Mobile-optimized interface

### 5.2 Performance Optimization

**Warp AI Prompt for Performance**:
```bash
Optimize the document management system for enterprise performance:

Optimization Areas:
- Lazy loading for document lists
- Virtual scrolling for large datasets
- Image optimization and progressive loading
- Code splitting by features
- Caching strategies for frequently accessed documents
- Database query optimization
- CDN integration for file delivery

Implement:
- React.memo for expensive components
- useMemo and useCallback for optimization
- Infinite scrolling for document lists
- Progressive image loading
- Service worker for caching
```

**Deliverable**: Optimized application with performance metrics

## Implementation Guidelines for Warp AI Agent

### Daily Development Workflow

1. **Start each session** with context about the current phase
2. **Break down large features** into smaller, manageable components
3. **Request code review** after each major component
4. **Ask for testing guidance** for each feature
5. **Integrate incrementally** with existing accounting system

### Warp AI Prompting Best Practices

**Context Setting**:
```bash
I'm working on Phase [X] of an enterprise document management system for a construction accounting app. The current task is [specific task]. I need help with [specific requirement].

Current tech stack: React TypeScript, Supabase, Tailwind CSS, React Query.
Existing database has: accounts, transactions, projects, organizations tables.
Target: Construction industry with Arabic language support.
```

**Component Development**:
```bash
Create a [ComponentName] component with the following requirements:
[List specific requirements]

Make sure to:
- Follow React TypeScript best practices
- Include proper error handling
- Add loading states
- Make it mobile-responsive
- Include accessibility features
- Add comprehensive TypeScript types
- Use Tailwind CSS for styling
```

**Integration Requests**:
```bash
I need to integrate the document management system with the existing [table/feature].
Current structure: [provide relevant schema/types]
Integration points needed: [specific requirements]
Expected behavior: [describe the workflow]
```

### Quality Assurance Checklist

For each component/feature, ensure:

**Functionality**:
- [ ] All requirements implemented
- [ ] Error handling included
- [ ] Loading states added
- [ ] Success feedback provided

**Code Quality**:
- [ ] TypeScript types defined
- [ ] ESLint rules followed
- [ ] Comments for complex logic
- [ ] Proper component structure

**UI/UX**:
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Consistent with design system
- [ ] Arabic language support where needed

**Integration**:
- [ ] Works with existing database schema
- [ ] Proper error propagation
- [ ] State management integrated
- [ ] API endpoints tested

## Success Metrics

By the end of implementation, the system should achieve:

**Functional Metrics**:
- Upload documents with 99% success rate
- Sub-second document search responses
- Support for 50+ concurrent users
- 99.9% uptime for document access

**User Experience Metrics**:
- One-click document upload from any screen
- Mobile upload completion rate > 95%
- User adoption rate > 80% within 30 days
- Average task completion time < 2 minutes

**Enterprise Metrics**:
- Full audit trail for all document operations
- Role-based access control compliance
- Automated backup and recovery procedures
- Integration with existing accounting workflows

This implementation plan provides a comprehensive roadmap for building an enterprise-grade document management system using Warp AI Agent assistance. Each phase builds upon the previous one, ensuring a solid foundation while progressively adding advanced features.