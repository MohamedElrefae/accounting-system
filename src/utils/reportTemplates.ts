import type { 
  ReportDefinition, 
  ReportFilter
} from '../types/reports';

export interface ReportTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'financial' | 'operational' | 'analytical' | 'compliance';
  datasetName: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedExecutionTime: string;
  template: Omit<ReportDefinition, 'id' | 'name' | 'description' | 'created_at' | 'updated_at'>;
  sampleFilters?: {
    name: string;
    description: string;
    filters: ReportFilter[];
  }[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'financial-summary',
    name: 'Financial Summary Report',
    nameAr: 'تقرير الملخص المالي',
    description: 'Comprehensive financial overview with key metrics and account balances',
    descriptionAr: 'ملخص مالي شامل مع المؤشرات الرئيسية وأرصدة الحسابات',
    category: 'financial',
    datasetName: 'المعاملات المالية',
    icon: '💰',
    difficulty: 'beginner',
    estimatedExecutionTime: '< 5 ثوانٍ',
    template: {
      dataset_id: '', // Will be filled when applied
      selected_fields: [
        'account_code',
        'account_name', 
        'amount',
        'entry_date',
        'organization_name'
      ],
      filters: [
        {
          field: 'is_posted',
          operator: 'eq',
          value: 'true',
          label: 'المعاملات المرحلة فقط'
        }
      ],
      sorts: [
        {
          field: 'account_code',
          direction: 'asc',
          label: 'ترتيب حسب كود الحساب'
        },
        {
          field: 'entry_date',
          direction: 'desc',
          label: 'ترتيب حسب التاريخ'
        }
      ],
      group_by: [
        {
          field: 'account_code',
          label: 'تجميع حسب الحساب'
        }
      ],
      limit: 1000,
      is_public: false
    },
    sampleFilters: [
      {
        name: 'المعاملات الشهرية',
        description: 'معاملات الشهر الحالي فقط',
        filters: [
          {
            field: 'entry_date',
            operator: 'gte',
            value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            label: 'من بداية الشهر الحالي'
          }
        ]
      },
      {
        name: 'مبالغ كبيرة',
        description: 'المعاملات التي تزيد عن 10,000',
        filters: [
          {
            field: 'amount',
            operator: 'gt',
            value: '10000',
            label: 'المبلغ أكبر من 10,000'
          }
        ]
      }
    ]
  },
  {
    id: 'transaction-details',
    name: 'Detailed Transaction Report',
    nameAr: 'تقرير تفاصيل المعاملات',
    description: 'Detailed view of all transactions with complete information',
    descriptionAr: 'عرض تفصيلي لجميع المعاملات مع المعلومات الكاملة',
    category: 'operational',
    datasetName: 'المعاملات المالية',
    icon: '📊',
    difficulty: 'beginner',
    estimatedExecutionTime: '< 10 ثوانٍ',
    template: {
      dataset_id: '',
      selected_fields: [
        'entry_number',
        'entry_date',
        'description',
        'amount',
        'account_code',
        'account_name',
        'project_code',
        'project_name',
        'is_posted'
      ],
      filters: [],
      sorts: [
        {
          field: 'entry_date',
          direction: 'desc',
          label: 'أحدث المعاملات أولاً'
        },
        {
          field: 'entry_number',
          direction: 'desc',
          label: 'ترتيب حسب رقم القيد'
        }
      ],
      group_by: [],
      limit: 500,
      is_public: false
    },
    sampleFilters: [
      {
        name: 'المعاملات الغير مرحلة',
        description: 'المعاملات التي تحتاج ترحيل',
        filters: [
          {
            field: 'is_posted',
            operator: 'eq',
            value: 'false',
            label: 'غير مرحل'
          }
        ]
      },
      {
        name: 'معاملات مشروع محدد',
        description: 'معاملات مشروع PRJ001',
        filters: [
          {
            field: 'project_code',
            operator: 'eq',
            value: 'PRJ001',
            label: 'المشروع PRJ001'
          }
        ]
      }
    ]
  },
  {
    id: 'account-analysis',
    name: 'Account Analysis Report',
    nameAr: 'تقرير تحليل الحسابات',
    description: 'Comprehensive analysis of account activity and balances',
    descriptionAr: 'تحليل شامل لنشاط الحسابات والأرصدة',
    category: 'analytical',
    datasetName: 'الحسابات',
    icon: '🔍',
    difficulty: 'intermediate',
    estimatedExecutionTime: '< 15 ثانية',
    template: {
      dataset_id: '',
      selected_fields: [
        'code',
        'name',
        'name_ar',
        'level',
        'category',
        'status',
        'is_active'
      ],
      filters: [
        {
          field: 'is_active',
          operator: 'eq',
          value: 'true',
          label: 'الحسابات النشطة فقط'
        }
      ],
      sorts: [
        {
          field: 'level',
          direction: 'asc',
          label: 'ترتيب حسب المستوى'
        },
        {
          field: 'code',
          direction: 'asc',
          label: 'ترتيب حسب الكود'
        }
      ],
      group_by: [
        {
          field: 'category',
          label: 'تجميع حسب الفئة'
        },
        {
          field: 'level',
          label: 'تجميع حسب المستوى'
        }
      ],
      limit: 1000,
      is_public: false
    },
    sampleFilters: [
      {
        name: 'الحسابات الرئيسية',
        description: 'حسابات المستوى الأول فقط',
        filters: [
          {
            field: 'level',
            operator: 'eq',
            value: '1',
            label: 'المستوى الأول'
          }
        ]
      },
      {
        name: 'حسابات الأصول',
        description: 'حسابات فئة الأصول',
        filters: [
          {
            field: 'category',
            operator: 'eq',
            value: 'Asset',
            label: 'فئة الأصول'
          }
        ]
      }
    ]
  },
  {
    id: 'project-financial',
    name: 'Project Financial Report',
    nameAr: 'التقرير المالي للمشاريع',
    description: 'Financial performance analysis by project',
    descriptionAr: 'تحليل الأداء المالي حسب المشروع',
    category: 'financial',
    datasetName: 'المشاريع',
    icon: '📈',
    difficulty: 'intermediate',
    estimatedExecutionTime: '< 8 ثوانٍ',
    template: {
      dataset_id: '',
      selected_fields: [
        'code',
        'name',
        'name_ar',
        'status',
        'start_date',
        'end_date',
        'budget_amount'
      ],
      filters: [
        {
          field: 'status',
          operator: 'neq',
          value: 'inactive',
          label: 'المشاريع النشطة والمكتملة'
        }
      ],
      sorts: [
        {
          field: 'start_date',
          direction: 'desc',
          label: 'أحدث المشاريع أولاً'
        },
        {
          field: 'budget_amount',
          direction: 'desc',
          label: 'أكبر ميزانية أولاً'
        }
      ],
      group_by: [
        {
          field: 'status',
          label: 'تجميع حسب الحالة'
        }
      ],
      limit: 100,
      is_public: false
    },
    sampleFilters: [
      {
        name: 'المشاريع المكتملة',
        description: 'المشاريع التي اكتملت',
        filters: [
          {
            field: 'status',
            operator: 'eq',
            value: 'completed',
            label: 'مكتمل'
          }
        ]
      },
      {
        name: 'المشاريع الكبيرة',
        description: 'المشاريع بميزانية أكبر من 500,000',
        filters: [
          {
            field: 'budget_amount',
            operator: 'gt',
            value: '500000',
            label: 'الميزانية أكبر من 500,000'
          }
        ]
      }
    ]
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit Report',
    nameAr: 'تقرير الامتثال والمراجعة',
    description: 'Compliance and audit trail report for regulatory requirements',
    descriptionAr: 'تقرير الامتثال ومسار المراجعة للمتطلبات التنظيمية',
    category: 'compliance',
    datasetName: 'المعاملات المالية',
    icon: '📋',
    difficulty: 'advanced',
    estimatedExecutionTime: '< 20 ثانية',
    template: {
      dataset_id: '',
      selected_fields: [
        'entry_number',
        'entry_date',
        'description',
        'amount',
        'account_code',
        'account_name',
        'is_posted',
        'organization_name'
      ],
      filters: [
        {
          field: 'is_posted',
          operator: 'eq',
          value: 'true',
          label: 'المعاملات المرحلة فقط'
        }
      ],
      sorts: [
        {
          field: 'entry_date',
          direction: 'asc',
          label: 'ترتيب تاريخي'
        },
        {
          field: 'entry_number',
          direction: 'asc',
          label: 'ترتيب حسب رقم القيد'
        }
      ],
      group_by: [
        {
          field: 'organization_name',
          label: 'تجميع حسب المؤسسة'
        }
      ],
      limit: 2000,
      is_public: false
    },
    sampleFilters: [
      {
        name: 'معاملات السنة المالية',
        description: 'معاملات السنة المالية الحالية',
        filters: [
          {
            field: 'entry_date',
            operator: 'gte',
            value: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
            label: 'من بداية السنة المالية'
          }
        ]
      },
      {
        name: 'المعاملات عالية القيمة',
        description: 'معاملات تتطلب مراجعة خاصة',
        filters: [
          {
            field: 'amount',
            operator: 'gt',
            value: '50000',
            label: 'المبلغ أكبر من 50,000'
          }
        ]
      }
    ]
  }
];

/**
 * Get all available report templates
 */
export function getReportTemplates(): ReportTemplate[] {
  return REPORT_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ReportTemplate['category']): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find(template => template.id === id);
}

/**
 * Get templates by difficulty level
 */
export function getTemplatesByDifficulty(difficulty: ReportTemplate['difficulty']): ReportTemplate[] {
  return REPORT_TEMPLATES.filter(template => template.difficulty === difficulty);
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): ReportTemplate[] {
  const lowerQuery = query.toLowerCase();
  return REPORT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.nameAr.includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.descriptionAr.includes(lowerQuery)
  );
}

/**
 * Apply a template to create a report definition
 */
export function applyTemplate(
  template: ReportTemplate,
  datasetId: string,
  customName?: string,
  customDescription?: string
): Omit<ReportDefinition, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: customName || template.nameAr,
    description: customDescription || template.descriptionAr,
    dataset_id: datasetId,
    selected_fields: template.template.selected_fields,
    filters: template.template.filters,
    sorts: template.template.sorts,
    group_by: template.template.group_by,
    limit: template.template.limit,
    is_public: template.template.is_public
  };
}

/**
 * Get category display information
 */
export function getCategoryInfo(category: ReportTemplate['category']) {
  const categoryMap = {
    financial: {
      name: 'المالية',
      nameEn: 'Financial',
      icon: '💰',
      color: 'primary' as const,
      description: 'تقارير الأداء المالي والمحاسبي'
    },
    operational: {
      name: 'التشغيلية',
      nameEn: 'Operational',
      icon: '⚙️',
      color: 'secondary' as const,
      description: 'تقارير العمليات اليومية والإجرائية'
    },
    analytical: {
      name: 'التحليلية',
      nameEn: 'Analytical',
      icon: '📊',
      color: 'info' as const,
      description: 'تقارير التحليل والإحصائيات'
    },
    compliance: {
      name: 'الامتثال',
      nameEn: 'Compliance',
      icon: '📋',
      color: 'warning' as const,
      description: 'تقارير الامتثال والمراجعة'
    }
  };

  return categoryMap[category];
}

/**
 * Get difficulty level display information
 */
export function getDifficultyInfo(difficulty: ReportTemplate['difficulty']) {
  const difficultyMap = {
    beginner: {
      name: 'مبتدئ',
      nameEn: 'Beginner',
      icon: '🟢',
      color: 'success' as const,
      description: 'سهل الاستخدام للمبتدئين'
    },
    intermediate: {
      name: 'متوسط',
      nameEn: 'Intermediate',
      icon: '🟡',
      color: 'warning' as const,
      description: 'يتطلب بعض الخبرة'
    },
    advanced: {
      name: 'متقدم',
      nameEn: 'Advanced',
      icon: '🔴',
      color: 'error' as const,
      description: 'للمستخدمين المتقدمين'
    }
  };

  return difficultyMap[difficulty];
}
