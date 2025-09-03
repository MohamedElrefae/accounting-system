import { supabase } from './supabase';

export interface SampleDataset {
  name: string;
  description: string;
  table_name: string;
  allowed_fields: string[];
  sample_fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    filterable: boolean;
    sortable: boolean;
    groupable: boolean;
  }>;
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: 'المعاملات المالية',
    description: 'جميع المعاملات المالية مع تفاصيل الحسابات والمشاريع وبنود العمل ومراكز التكلفة',
    table_name: 'v_transactions_enriched',
    allowed_fields: [
      'id', 'entry_number', 'entry_date', 'description', 'amount', 'debit_account_id',
      'debit_account_code', 'debit_account_name', 'credit_account_id', 'credit_account_code', 
      'credit_account_name', 'project_id', 'project_name', 'organization_name', 'is_posted',
      'classification_id', 'classification_code', 'classification_name', 'expenses_category_id',
      'expenses_category_code', 'expenses_category_name', 'work_item_id', 'work_item_code',
      'work_item_name', 'cost_center_id', 'cost_center_code', 'cost_center_name', 'created_at',
      'updated_at', 'notes', 'reference_number', 'source_document'
    ],
    sample_fields: [
      {
        name: 'entry_number',
        label: 'رقم القيد',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'entry_date',
        label: 'تاريخ القيد',
        type: 'date',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'description',
        label: 'الوصف',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'amount',
        label: 'المبلغ',
        type: 'number',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'debit_account_code',
        label: 'كود الحساب المدين',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'debit_account_name',
        label: 'اسم الحساب المدين',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'credit_account_code',
        label: 'كود الحساب الدائن',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'credit_account_name',
        label: 'اسم الحساب الدائن',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'project_name',
        label: 'اسم المشروع',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'work_item_code',
        label: 'كود بند العمل',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'work_item_name',
        label: 'اسم بند العمل',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'cost_center_code',
        label: 'كود مركز التكلفة',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'cost_center_name',
        label: 'اسم مركز التكلفة',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'classification_code',
        label: 'كود التصنيف',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'classification_name',
        label: 'اسم التصنيف',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'expenses_category_code',
        label: 'كود فئة المصروفات',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'expenses_category_name',
        label: 'اسم فئة المصروفات',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'organization_name',
        label: 'اسم المؤسسة',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'is_posted',
        label: 'مرحل',
        type: 'boolean',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'reference_number',
        label: 'رقم المرجع',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'source_document',
        label: 'المستند المصدر',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'notes',
        label: 'الملاحظات',
        type: 'text',
        filterable: true,
        sortable: false,
        groupable: false
      },
      {
        name: 'created_at',
        label: 'تاريخ الإنشاء',
        type: 'date',
        filterable: true,
        sortable: true,
        groupable: true
      }
    ]
  },
  {
    name: 'الحسابات',
    description: 'دليل الحسابات مع التسلسل الهرمي',
    table_name: 'accounts',
    allowed_fields: [
      'id', 'code', 'name', 'name_ar', 'category', 'normal_balance', 'parent_id', 'level', 
      'path', 'status', 'description', 'description_ar', 'is_standard', 'allow_transactions',
      'is_postable', 'org_id', 'created_at', 'updated_at'
    ],
    sample_fields: [
      {
        name: 'code',
        label: 'كود الحساب',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'name',
        label: 'اسم الحساب',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'name_ar',
        label: 'الاسم بالعربية',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'level',
        label: 'المستوى',
        type: 'number',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'category',
        label: 'الفئة',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'status',
        label: 'الحالة',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'allow_transactions',
        label: 'يسمح بالمعاملات',
        type: 'boolean',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'is_postable',
        label: 'قابل للترحيل',
        type: 'boolean',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'normal_balance',
        label: 'الرصيد الطبيعي',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      }
    ]
  },
  {
    name: 'المشاريع',
    description: 'قائمة المشاريع مع تفاصيل الميزانية والحالة',
    table_name: 'projects',
    allowed_fields: [
      'id', 'code', 'name', 'name_ar', 'description', 'status', 'start_date', 'end_date', 
      'budget', 'org_id', 'created_at', 'updated_at', 'created_by'
    ],
    sample_fields: [
      {
        name: 'code',
        label: 'كود المشروع',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'name',
        label: 'اسم المشروع',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'name_ar',
        label: 'الاسم بالعربية',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'status',
        label: 'حالة المشروع',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'start_date',
        label: 'تاريخ البداية',
        type: 'date',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'end_date',
        label: 'تاريخ النهاية',
        type: 'date',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'budget',
        label: 'مبلغ الميزانية',
        type: 'number',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'created_at',
        label: 'تاريخ الإنشاء',
        type: 'date',
        filterable: true,
        sortable: true,
        groupable: true
      }
    ]
  },
  {
    name: 'بنود العمل',
    description: 'بنود العمل الخاصة بالمشاريع مع التسلسل الهرمي',
    table_name: 'work_items',
    allowed_fields: [
      'id', 'code', 'name', 'name_ar', 'description', 'unit_of_measure', 'is_active', 
      'position', 'parent_id', 'project_id', 'org_id', 'created_at', 'updated_at'
    ],
    sample_fields: [
      {
        name: 'code',
        label: 'كود بند العمل',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'name',
        label: 'اسم بند العمل',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'name_ar',
        label: 'الاسم بالعربية',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: false
      },
      {
        name: 'description',
        label: 'الوصف',
        type: 'text',
        filterable: true,
        sortable: false,
        groupable: false
      },
      {
        name: 'unit_of_measure',
        label: 'وحدة القياس',
        type: 'text',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'is_active',
        label: 'نشط',
        type: 'boolean',
        filterable: true,
        sortable: true,
        groupable: true
      },
      {
        name: 'position',
        label: 'الترتيب',
        type: 'number',
        filterable: true,
        sortable: true,
        groupable: false
      }
    ]
  }
];

/**
 * Populate sample datasets for development/testing
 */
export async function populateSampleDatasets(): Promise<void> {
  try {
    console.log('🚀 Populating sample datasets...');

    // First, check if datasets already exist
    const { data: existingDatasets } = await supabase
      .from('report_datasets')
      .select('name');

    const existingNames = new Set(existingDatasets?.map(d => d.name) || []);

    for (const dataset of SAMPLE_DATASETS) {
      if (existingNames.has(dataset.name)) {
        console.log(`⏭️  Dataset "${dataset.name}" already exists, skipping...`);
        continue;
      }

      // Insert the dataset
      const { data: _, error: datasetError } = await supabase
        .from('report_datasets')
        .insert({
          name: dataset.name,
          description: dataset.description,
          table_name: dataset.table_name,
          allowed_fields: dataset.allowed_fields,
          is_active: true
        })
        .select()
        .single();

      if (datasetError) {
        console.error(`❌ Error inserting dataset "${dataset.name}":`, datasetError);
        continue;
      }

      console.log(`✅ Created dataset: ${dataset.name}`);

      // Note: Field definitions would typically be stored in a separate table
      // or generated dynamically by the get_dataset_fields RPC function
      // This is just for reference in development
    }

    console.log('🎉 Sample datasets population completed!');
  } catch (error) {
    console.error('❌ Error populating sample datasets:', error);
    throw error;
  }
}

/**
 * Get mock field definitions for a dataset (for development when RPC is not available)
 */
export function getMockDatasetFields(datasetName: string) {
  const dataset = SAMPLE_DATASETS.find(d => d.name === datasetName);
  return dataset?.sample_fields || [];
}

/**
 * Generate mock report data for testing
 */
export function generateMockReportData(fieldNames: string[], rowCount: number = 10) {
  const mockData = [];
  
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, any> = {};
    
    fieldNames.forEach(fieldName => {
      switch (fieldName) {
        case 'entry_number':
          row[fieldName] = `JE-2024-${String(i + 1).padStart(4, '0')}`;
          break;
        case 'entry_date':
          row[fieldName] = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
          break;
        case 'description':
          row[fieldName] = ['مشتريات مكتبية', 'مبيعات نقدية', 'دفع راتب', 'إيجار المكتب', 'فاتورة كهرباء'][Math.floor(Math.random() * 5)];
          break;
        case 'amount':
          row[fieldName] = Math.floor(Math.random() * 10000) + 100;
          break;
        case 'account_code':
          row[fieldName] = ['1001', '1002', '2001', '3001', '4001'][Math.floor(Math.random() * 5)];
          break;
        case 'account_name':
          row[fieldName] = ['النقدية', 'البنك', 'الموردين', 'رأس المال', 'المبيعات'][Math.floor(Math.random() * 5)];
          break;
        case 'project_code':
          row[fieldName] = ['PRJ001', 'PRJ002', 'PRJ003'][Math.floor(Math.random() * 3)];
          break;
        case 'project_name':
          row[fieldName] = ['مشروع التطوير', 'مشروع التسويق', 'مشروع البحث'][Math.floor(Math.random() * 3)];
          break;
        case 'organization_name':
          row[fieldName] = 'شركة المثال للمحاسبة';
          break;
        case 'is_posted':
          row[fieldName] = Math.random() > 0.3;
          break;
        case 'code':
          row[fieldName] = `${Math.floor(Math.random() * 9) + 1}${String(i + 1).padStart(3, '0')}`;
          break;
        case 'name':
          row[fieldName] = ['Cash', 'Bank', 'Accounts Receivable', 'Inventory', 'Equipment'][Math.floor(Math.random() * 5)];
          break;
        case 'name_ar':
          row[fieldName] = ['النقدية', 'البنك', 'العملاء', 'المخزون', 'المعدات'][Math.floor(Math.random() * 5)];
          break;
        case 'level':
          row[fieldName] = Math.floor(Math.random() * 4) + 1;
          break;
        case 'category':
          row[fieldName] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'][Math.floor(Math.random() * 5)];
          break;
        case 'status':
          row[fieldName] = ['active', 'inactive'][Math.floor(Math.random() * 2)];
          break;
        case 'is_active':
          row[fieldName] = Math.random() > 0.2;
          break;
        case 'start_date':
          row[fieldName] = new Date(2024, Math.floor(Math.random() * 6), 1).toISOString().split('T')[0];
          break;
        case 'end_date':
          row[fieldName] = new Date(2024, Math.floor(Math.random() * 6) + 6, 30).toISOString().split('T')[0];
          break;
        case 'budget_amount':
          row[fieldName] = Math.floor(Math.random() * 1000000) + 50000;
          break;
        default:
          row[fieldName] = `Sample ${fieldName} ${i + 1}`;
      }
    });
    
    mockData.push(row);
  }
  
  return {
    columns: fieldNames.map(name => ({
      field: name,
      label: SAMPLE_DATASETS.flatMap(d => d.sample_fields).find(f => f.name === name)?.label || name,
      type: SAMPLE_DATASETS.flatMap(d => d.sample_fields).find(f => f.name === name)?.type || 'text'
    })),
    data: mockData,
    total_count: mockData.length,
    execution_time_ms: Math.floor(Math.random() * 100) + 10
  };
}
