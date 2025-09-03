# تعليمات تنفيذ نظام التقارير المخصصة للتطبيق المحاسبي

## 📋 نظرة عامة

هذا الدليل يوضح كيفية تطوير نظام تقارير متقدم ومرن للتطبيق المحاسبي التجاري. النظام الحالي يحتوي على قاعدة بيانات قوية مع جداول محاسبية متكاملة وحاجة لنظام تقارير يدعم التخصيص والتحليل المتقدم.

## 🗄️ تحليل النظام الحالي

### البنية الأساسية لقاعدة البيانات
```sql
-- الجداول الرئيسية الموجودة:
- transactions (القيود المحاسبية)
- accounts (دليل الحسابات)
- projects (المشاريع)
- cost_centers (مراكز التكلفة)
- work_items (بنود الأعمال)
- expenses_categories (تصنيفات المصروفات)
- organizations (المنظمات)
- users (المستخدمين)
- roles & permissions (الأدوار والصلاحيات)
```

### النماذج الرئيسية المستخدمة
```typescript
interface Transaction {
  id: string;
  entry_number: string;
  entry_date: string;
  amount: number;
  description: string;
  notes?: string;
  org_id: string;
  project_id?: string;
  cost_center_id?: string;
  work_item_id?: string;
  classification_id?: string;
  expenses_category_id?: string;
  debit_account_id: string;
  credit_account_id: string;
  is_posted: boolean;
}

interface Account {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normal_balance: 'debit' | 'credit';
  level: number;
  path: string;
  parent_id?: string;
}
```

## 🎯 متطلبات نظام التقارير

### 1. التقارير الأساسية المطلوبة

#### تقارير القوائم المالية
- **الميزانية العمومية**
- **قائمة الدخل**
- **قائمة التدفقات النقدية**
- **قائمة التغيرات في حقوق الملكية**

#### تقارير إدارية
- **تحليل ربحية المشاريع**
- **أداء مراكز التكلفة**
- **تحليل المصروفات حسب التصنيف**
- **تقارير أعمار الذمم**

#### تقارير تحليلية
- **التحليل متعدد الأبعاد**
- **مقارنات الفترات الزمنية**
- **تحليل الانحرافات**
- **مؤشرات الأداء الرئيسية (KPIs)**

### 2. متطلبات التخصيص

#### واجهة منشئ التقارير
- **سحب وإفلات الأبعاد** (Dimensions)
- **اختيار المقاييس** (Measures) 
- **تصفية ديناميكية** بشروط معقدة
- **تجميع متعدد المستويات** مع مجاميع فرعية
- **تنسيق مرئي متقدم** مع رسوم بيانية

#### إدارة التقارير المخصصة
- **حفظ ومشاركة التقارير**
- **قوالب تقارير** للاستخدام المتكرر
- **جدولة التقارير** والإرسال التلقائي
- **صلاحيات المشاهدة والتعديل**

## 🏗️ الهيكل المطلوب للتطوير

### 1. جداول إضافية مطلوبة

```sql
-- جدول التقارير المخصصة
CREATE TABLE reporting.custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    owner_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    report_type TEXT CHECK (report_type IN ('financial_statement', 'management', 'analytical', 'custom')),
    
    -- تكوين التقرير بصيغة JSON
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- الأبعاد المستخدمة
    dimensions TEXT[] DEFAULT '{}',
    -- المقاييس المستخدمة  
    measures TEXT[] DEFAULT '{}',
    -- شروط التصفية
    filters JSONB DEFAULT '{}'::jsonb,
    -- إعدادات التجميع
    grouping JSONB DEFAULT '{}'::jsonb,
    -- إعدادات التنسيق
    formatting JSONB DEFAULT '{}'::jsonb,
    
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- جدول جدولة التقارير
CREATE TABLE reporting.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reporting.custom_reports(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL, -- "0 9 * * 1" = كل اثنين الساعة 9 صباحاً
    output_format TEXT DEFAULT 'pdf' CHECK (output_format IN ('pdf', 'excel', 'csv')),
    
    -- قائمة المستلمين
    recipients JSONB DEFAULT '[]'::jsonb,
    -- معاملات إضافية للتقرير
    parameters JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- جدول تنفيذ التقارير (للمراقبة)
CREATE TABLE reporting.report_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reporting.custom_reports(id),
    schedule_id UUID REFERENCES reporting.report_schedules(id),
    executed_by UUID REFERENCES auth.users(id),
    
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    execution_time TIMESTAMPTZ DEFAULT NOW(),
    completion_time TIMESTAMPTZ,
    duration_ms INTEGER,
    
    parameters JSONB DEFAULT '{}'::jsonb,
    result_info JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Views للتقارير

```sql
-- View شامل للتحليل متعدد الأبعاد
CREATE VIEW reporting.v_transaction_analytics AS
SELECT 
    t.id as transaction_id,
    t.entry_number,
    t.entry_date,
    t.amount,
    t.description,
    t.notes,
    t.is_posted,
    t.org_id,
    
    -- معلومات الحسابات
    a_debit.code as debit_account_code,
    a_debit.name as debit_account_name,
    a_debit.name_ar as debit_account_name_ar,
    a_debit.category as debit_account_category,
    a_debit.normal_balance as debit_account_normal_balance,
    
    a_credit.code as credit_account_code,
    a_credit.name as credit_account_name,
    a_credit.name_ar as credit_account_name_ar,
    a_credit.category as credit_account_category,
    a_credit.normal_balance as credit_account_normal_balance,
    
    -- معلومات المشروع
    p.code as project_code,
    p.name as project_name,
    p.status as project_status,
    
    -- مركز التكلفة
    cc.code as cost_center_code,
    cc.name as cost_center_name,
    cc.name_ar as cost_center_name_ar,
    
    -- بند العمل
    wi.code as work_item_code,
    wi.name as work_item_name,
    wi.name_ar as work_item_name_ar,
    
    -- تصنيف المصروفات
    ec.code as expense_category_code,
    ec.description as expense_category_description,
    ec.add_to_cost,
    
    -- تصنيف المعاملة
    tc.name as transaction_classification,
    tc.post_to_costs,
    
    -- أبعاد زمنية
    EXTRACT(YEAR FROM t.entry_date) as entry_year,
    EXTRACT(QUARTER FROM t.entry_date) as entry_quarter,
    EXTRACT(MONTH FROM t.entry_date) as entry_month,
    EXTRACT(DAY FROM t.entry_date) as entry_day,
    TO_CHAR(t.entry_date, 'YYYY-MM') as year_month,
    TO_CHAR(t.entry_date, 'YYYY-"Q"Q') as year_quarter,
    
    -- حساب المبلغ بناء على طبيعة الحساب
    CASE 
        WHEN a_debit.normal_balance = 'debit' THEN t.amount 
        ELSE -t.amount 
    END as debit_amount,
    
    CASE 
        WHEN a_credit.normal_balance = 'credit' THEN t.amount 
        ELSE -t.amount 
    END as credit_amount,
    
    -- معلومات المستخدم
    t.created_by,
    t.created_at,
    t.updated_by,
    t.updated_at

FROM transactions t
LEFT JOIN accounts a_debit ON a_debit.id = t.debit_account_id
LEFT JOIN accounts a_credit ON a_credit.id = t.credit_account_id
LEFT JOIN projects p ON p.id = t.project_id
LEFT JOIN cost_centers cc ON cc.id = t.cost_center_id
LEFT JOIN work_items wi ON wi.id = t.work_item_id
LEFT JOIN expenses_categories ec ON ec.id = t.expenses_category_id
LEFT JOIN transaction_classification tc ON tc.id = t.classification_id;

-- View أرصدة الحسابات
CREATE VIEW reporting.v_account_balances AS
WITH account_transactions AS (
    SELECT 
        account_id,
        account_code,
        account_name,
        account_category,
        normal_balance,
        org_id,
        SUM(amount) as total_amount
    FROM (
        SELECT 
            a.id as account_id,
            a.code as account_code,
            a.name as account_name,
            a.category as account_category,
            a.normal_balance,
            t.org_id,
            CASE 
                WHEN a.normal_balance = 'debit' THEN t.amount
                ELSE -t.amount
            END as amount
        FROM transactions t
        JOIN accounts a ON a.id = t.debit_account_id
        WHERE t.is_posted = true
        
        UNION ALL
        
        SELECT 
            a.id as account_id,
            a.code as account_code,
            a.name as account_name,
            a.category as account_category,
            a.normal_balance,
            t.org_id,
            CASE 
                WHEN a.normal_balance = 'credit' THEN t.amount
                ELSE -t.amount
            END as amount
        FROM transactions t
        JOIN accounts a ON a.id = t.credit_account_id
        WHERE t.is_posted = true
    ) combined
    GROUP BY account_id, account_code, account_name, account_category, normal_balance, org_id
)
SELECT 
    *,
    ABS(total_amount) as balance,
    CASE 
        WHEN total_amount >= 0 THEN normal_balance
        ELSE CASE WHEN normal_balance = 'debit' THEN 'credit' ELSE 'debit' END
    END as balance_side
FROM account_transactions;
```

### 3. دوال RPC للتقارير

```sql
-- دالة توليد التقارير الديناميكية
CREATE OR REPLACE FUNCTION reporting.generate_dynamic_report(
    report_config JSONB
) RETURNS TABLE (
    dimension_values JSONB,
    measure_values JSONB,
    is_subtotal BOOLEAN,
    is_grand_total BOOLEAN,
    level INTEGER
) AS $$
DECLARE
    base_query TEXT;
    dimensions TEXT[];
    measures TEXT[];
    filters JSONB;
    grouping JSONB;
    where_clause TEXT DEFAULT '';
    group_by_clause TEXT DEFAULT '';
    select_clause TEXT DEFAULT '';
    i INTEGER;
BEGIN
    -- استخراج المعاملات من التكوين
    dimensions := ARRAY(SELECT jsonb_array_elements_text(report_config->'dimensions'));
    measures := ARRAY(SELECT jsonb_array_elements_text(report_config->'measures'));
    filters := COALESCE(report_config->'filters', '{}'::jsonb);
    grouping := COALESCE(report_config->'grouping', '{}'::jsonb);
    
    -- بناء SELECT clause
    FOR i IN 1..array_length(dimensions, 1) LOOP
        IF i > 1 THEN
            select_clause := select_clause || ', ';
        END IF;
        select_clause := select_clause || dimensions[i];
    END LOOP;
    
    -- إضافة المقاييس
    FOR i IN 1..array_length(measures, 1) LOOP
        select_clause := select_clause || ', ';
        CASE measures[i]
            WHEN 'sum_amount' THEN 
                select_clause := select_clause || 'SUM(amount) as sum_amount';
            WHEN 'count_transactions' THEN
                select_clause := select_clause || 'COUNT(*) as count_transactions';
            WHEN 'avg_amount' THEN
                select_clause := select_clause || 'AVG(amount) as avg_amount';
            ELSE
                select_clause := select_clause || measures[i];
        END CASE;
    END LOOP;
    
    -- بناء WHERE clause من الفلاتر
    IF jsonb_typeof(filters) = 'object' AND jsonb_object_keys(filters) IS NOT NULL THEN
        where_clause := ' WHERE 1=1 ';
        -- إضافة الفلاتر هنا حسب الحاجة
    END IF;
    
    -- بناء GROUP BY clause
    IF array_length(dimensions, 1) > 0 THEN
        group_by_clause := ' GROUP BY ROLLUP(' || array_to_string(dimensions, ', ') || ')';
    END IF;
    
    -- تنفيذ الاستعلام الديناميكي
    base_query := 'SELECT ' || select_clause || 
                  ' FROM reporting.v_transaction_analytics' ||
                  where_clause ||
                  group_by_clause ||
                  ' ORDER BY ' || COALESCE(array_to_string(dimensions, ', '), '1');
    
    RETURN QUERY EXECUTE base_query;
END;
$$ LANGUAGE plpgsql;

-- دالة لحفظ تقرير مخصص
CREATE OR REPLACE FUNCTION reporting.save_custom_report(
    report_name TEXT,
    report_config JSONB,
    org_id UUID,
    user_id UUID
) RETURNS UUID AS $$
DECLARE
    new_report_id UUID;
BEGIN
    INSERT INTO reporting.custom_reports (
        name, config, org_id, owner_id, created_by
    ) VALUES (
        report_name, report_config, org_id, user_id, user_id
    ) RETURNING id INTO new_report_id;
    
    RETURN new_report_id;
END;
$$ LANGUAGE plpgsql;
```

## 💻 تطوير واجهة المستخدم

### 1. صفحة التقارير الرئيسية

```typescript
// components/reports/ReportsPage.tsx
interface ReportsPageProps {
  user: User;
  organization: Organization;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ user, organization }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'scheduled'>('templates');
  
  return (
    <div className="reports-container" dir="rtl">
      <div className="reports-header">
        <h1>التقارير والتحليلات</h1>
        <div className="reports-actions">
          <Button 
            onClick={() => setActiveTab('custom')}
            className="primary"
          >
            إنشاء تقرير جديد
          </Button>
        </div>
      </div>
      
      <div className="reports-tabs">
        <Tab 
          active={activeTab === 'templates'} 
          onClick={() => setActiveTab('templates')}
        >
          القوالب الجاهزة
        </Tab>
        <Tab 
          active={activeTab === 'custom'} 
          onClick={() => setActiveTab('custom')}
        >
          التقارير المخصصة
        </Tab>
        <Tab 
          active={activeTab === 'scheduled'} 
          onClick={() => setActiveTab('scheduled')}
        >
          التقارير المجدولة
        </Tab>
      </div>
      
      <div className="reports-content">
        {activeTab === 'templates' && <ReportTemplates />}
        {activeTab === 'custom' && <CustomReportBuilder />}
        {activeTab === 'scheduled' && <ScheduledReports />}
      </div>
    </div>
  );
};
```

### 2. منشئ التقارير المخصصة

```typescript
// components/reports/CustomReportBuilder.tsx
interface ReportConfig {
  dimensions: string[];
  measures: string[];
  filters: Record<string, any>;
  grouping: {
    levels: string[];
    showSubtotals: boolean;
    showGrandTotal: boolean;
  };
  formatting: {
    chartType?: 'table' | 'bar' | 'line' | 'pie';
    showNumbers: boolean;
    numberFormat: string;
  };
}

export const CustomReportBuilder: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    dimensions: [],
    measures: [],
    filters: {},
    grouping: {
      levels: [],
      showSubtotals: true,
      showGrandTotal: true
    },
    formatting: {
      chartType: 'table',
      showNumbers: true,
      numberFormat: '#,##0'
    }
  });
  
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Available dimensions
  const availableDimensions = [
    { key: 'entry_year', label: 'السنة', category: 'time' },
    { key: 'entry_month', label: 'الشهر', category: 'time' },
    { key: 'project_name', label: 'المشروع', category: 'project' },
    { key: 'cost_center_name', label: 'مركز التكلفة', category: 'cost' },
    { key: 'debit_account_name', label: 'الحساب المدين', category: 'account' },
    { key: 'credit_account_name', label: 'الحساب الدائن', category: 'account' },
    { key: 'expense_category_description', label: 'تصنيف المصروف', category: 'expense' }
  ];
  
  // Available measures
  const availableMeasures = [
    { key: 'sum_amount', label: 'مجموع المبلغ', aggregation: 'sum' },
    { key: 'count_transactions', label: 'عدد المعاملات', aggregation: 'count' },
    { key: 'avg_amount', label: 'متوسط المبلغ', aggregation: 'avg' }
  ];
  
  const handleDimensionDrop = (dimension: string) => {
    if (!config.dimensions.includes(dimension)) {
      setConfig(prev => ({
        ...prev,
        dimensions: [...prev.dimensions, dimension]
      }));
    }
  };
  
  const handleMeasureDrop = (measure: string) => {
    if (!config.measures.includes(measure)) {
      setConfig(prev => ({
        ...prev,
        measures: [...prev.measures, measure]
      }));
    }
  };
  
  const generatePreview = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .rpc('generate_dynamic_report', { report_config: config });
      setPreviewData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="report-builder">
      <div className="builder-sidebar">
        <div className="dimensions-panel">
          <h3>الأبعاد المتاحة</h3>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="available-dimensions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {availableDimensions.map((dim, index) => (
                    <Draggable key={dim.key} draggableId={dim.key} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="dimension-item"
                        >
                          {dim.label}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        
        <div className="measures-panel">
          <h3>المقاييس المتاحة</h3>
          {availableMeasures.map(measure => (
            <div
              key={measure.key}
              className="measure-item"
              onClick={() => handleMeasureDrop(measure.key)}
            >
              {measure.label}
            </div>
          ))}
        </div>
      </div>
      
      <div className="builder-main">
        <div className="report-config">
          <div className="selected-dimensions">
            <h4>الأبعاد المحددة</h4>
            <Droppable droppableId="selected-dimensions">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="drop-zone">
                  {config.dimensions.map((dim, index) => (
                    <div key={dim} className="selected-item">
                      {availableDimensions.find(d => d.key === dim)?.label}
                      <button onClick={() => removeDimension(dim)}>×</button>
                    </div>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          
          <div className="selected-measures">
            <h4>المقاييس المحددة</h4>
            <div className="drop-zone">
              {config.measures.map(measure => (
                <div key={measure} className="selected-item">
                  {availableMeasures.find(m => m.key === measure)?.label}
                  <button onClick={() => removeMeasure(measure)}>×</button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="report-filters">
            <h4>الفلاتر</h4>
            <ReportFilters 
              filters={config.filters}
              onChange={(filters) => setConfig(prev => ({ ...prev, filters }))}
            />
          </div>
          
          <div className="report-actions">
            <Button onClick={generatePreview} loading={isLoading}>
              معاينة التقرير
            </Button>
            <Button onClick={saveReport} className="primary">
              حفظ التقرير
            </Button>
          </div>
        </div>
        
        <div className="report-preview">
          {isLoading ? (
            <div className="loading">جاري تحميل المعاينة...</div>
          ) : previewData ? (
            <ReportPreview data={previewData} config={config} />
          ) : (
            <div className="empty-state">
              اختر الأبعاد والمقاييس لمعاينة التقرير
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 3. مكون معاينة التقرير

```typescript
// components/reports/ReportPreview.tsx
interface ReportPreviewProps {
  data: any[];
  config: ReportConfig;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ data, config }) => {
  const formatNumber = (value: number, format: string = '#,##0') => {
    return new Intl.NumberFormat('ar-SA').format(value);
  };
  
  const renderTableReport = () => {
    if (!data || data.length === 0) return <div>لا توجد بيانات</div>;
    
    // إنشاء أعمدة الجدول
    const columns = [
      ...config.dimensions.map(dim => ({
        key: dim,
        title: availableDimensions.find(d => d.key === dim)?.label || dim,
        render: (value: any) => value || '-'
      })),
      ...config.measures.map(measure => ({
        key: measure,
        title: availableMeasures.find(m => m.key === measure)?.label || measure,
        render: (value: number) => formatNumber(value),
        align: 'left' as const
      }))
    ];
    
    return (
      <div className="report-table">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ textAlign: col.align || 'right' }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index}
                className={`
                  ${row.is_subtotal ? 'subtotal-row' : ''}
                  ${row.is_grand_total ? 'grand-total-row' : ''}
                `}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align || 'right' }}>
                    {col.render(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  const renderChartReport = () => {
    const chartData = data.filter(row => !row.is_subtotal && !row.is_grand_total);
    
    switch (config.formatting.chartType) {
      case 'bar':
        return <BarChart data={chartData} config={config} />;
      case 'line':
        return <LineChart data={chartData} config={config} />;
      case 'pie':
        return <PieChart data={chartData} config={config} />;
      default:
        return renderTableReport();
    }
  };
  
  return (
    <div className="report-preview-container">
      <div className="report-header">
        <h3>معاينة التقرير</h3>
        <div className="report-meta">
          <span>عدد الصفوف: {data.length}</span>
          <span>تاريخ التحديث: {new Date().toLocaleString('ar-SA')}</span>
        </div>
      </div>
      
      <div className="report-content">
        {config.formatting.chartType === 'table' ? renderTableReport() : renderChartReport()}
      </div>
      
      <div className="report-footer">
        <Button onClick={exportToPDF}>تصدير PDF</Button>
        <Button onClick={exportToExcel}>تصدير Excel</Button>
        <Button onClick={printReport}>طباعة</Button>
      </div>
    </div>
  );
};
```

## 📊 التقارير الجاهزة المطلوبة

### 1. الميزانية العمومية

```typescript
const balanceSheetTemplate = {
  name: "الميزانية العمومية",
  name_ar: "الميزانية العمومية", 
  report_type: "financial_statement",
  config: {
    dimensions: ["account_category", "account_name"],
    measures: ["sum_amount"],
    filters: {
      is_posted: true,
      entry_date: { operator: "between", value: ["2025-01-01", "2025-12-31"] }
    },
    grouping: {
      levels: ["account_category"],
      showSubtotals: true,
      showGrandTotal: true
    },
    formatting: {
      chartType: "table",
      showNumbers: true,
      numberFormat: "#,##0"
    }
  }
};
```

### 2. قائمة الدخل

```typescript
const incomeStatementTemplate = {
  name: "قائمة الدخل",
  name_ar: "قائمة الدخل",
  report_type: "financial_statement", 
  config: {
    dimensions: ["account_category", "account_name", "entry_month"],
    measures: ["sum_amount"],
    filters: {
      is_posted: true,
      account_category: { operator: "in", value: ["revenue", "expense"] },
      entry_date: { operator: "between", value: ["2025-01-01", "2025-12-31"] }
    },
    grouping: {
      levels: ["account_category", "entry_month"],
      showSubtotals: true,
      showGrandTotal: true
    }
  }
};
```

### 3. تحليل ربحية المشاريع

```typescript
const projectProfitabilityTemplate = {
  name: "تحليل ربحية المشاريع",
  name_ar: "تحليل ربحية المشاريع",
  report_type: "management",
  config: {
    dimensions: ["project_name", "account_category", "entry_quarter"],
    measures: ["sum_amount", "count_transactions"],
    filters: {
      is_posted: true,
      project_name: { operator: "not_null" },
      entry_date: { operator: "between", value: ["2025-01-01", "2025-12-31"] }
    },
    grouping: {
      levels: ["project_name"],
      showSubtotals: true,
      showGrandTotal: true
    },
    formatting: {
      chartType: "bar",
      showNumbers: true
    }
  }
};
```

## 🔐 نظام الصلاحيات

### إضافة صلاحيات التقارير

```sql
-- صلاحيات التقارير
INSERT INTO permissions (name, action, resource, name_ar, description_ar) VALUES
('reports.view', 'read', 'reports', 'عرض التقارير', 'عرض وتشغيل التقارير'),
('reports.create', 'create', 'reports', 'إنشاء التقارير', 'إنشاء تقارير مخصصة جديدة'),
('reports.edit', 'update', 'reports', 'تعديل التقارير', 'تعديل التقارير الموجودة'),
('reports.delete', 'delete', 'reports', 'حذف التقارير', 'حذف التقارير'),
('reports.schedule', 'create', 'report_schedules', 'جدولة التقارير', 'إنشاء جداول تنفيذ التقارير'),
('reports.export', 'create', 'report_exports', 'تصدير التقارير', 'تصدير التقارير بصيغ مختلفة');
```

### فحص الصلاحيات في الكود

```typescript
// hooks/useReportPermissions.ts
export const useReportPermissions = () => {
  const { user } = useAuth();
  
  const checkPermission = (action: string) => {
    // فحص صلاحيات المستخدم
    return user?.permissions?.includes(`reports.${action}`) || false;
  };
  
  return {
    canView: checkPermission('view'),
    canCreate: checkPermission('create'),
    canEdit: checkPermission('edit'),
    canDelete: checkPermission('delete'),
    canSchedule: checkPermission('schedule'),
    canExport: checkPermission('export')
  };
};
```

## 🚀 خطة التنفيذ

### المرحلة الأولى (الأسبوع 1-2): الهيكل الأساسي
1. **إنشاء الجداول المطلوبة** في قاعدة البيانات
2. **تطوير Views الأساسية** للتحليل
3. **إنشاء دوال RPC** للتقارير الديناميكية
4. **تطوير صفحة التقارير الرئيسية**

### المرحلة الثانية (الأسبوع 3-4): منشئ التقارير
1. **واجهة سحب وإفلات** للأبعاد والمقاييس
2. **نظام التصفية المتقدم**
3. **معاينة التقارير** في الوقت الفعلي
4. **حفظ ومشاركة التقارير**

### المرحلة الثالثة (الأسبوع 5-6): التقارير الجاهزة
1. **تطوير قوالب التقارير المالية**
2. **تقارير إدارية متخصصة**
3. **نظام التصدير** (PDF, Excel, CSV)
4. **الرسوم البيانية التفاعلية**

### المرحلة الرابعة (الأسبوع 7-8): الميزات المتقدمة
1. **نظام جدولة التقارير**
2. **الإشعارات والتنبيهات**
3. **تحسين الأداء والذاكرة المؤقتة**
4. **اختبارات شاملة وتحسينات**

## 🧪 اختبار النظام

### اختبارات الوحدة
```typescript
// tests/reports.test.ts
describe('Report Generation', () => {
  test('should generate balance sheet correctly', async () => {
    const config = balanceSheetTemplate.config;
    const result = await generateDynamicReport(config);
    
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('dimension_values');
    expect(result[0]).toHaveProperty('measure_values');
  });
  
  test('should handle empty data gracefully', async () => {
    const config = { dimensions: [], measures: [], filters: {} };
    const result = await generateDynamicReport(config);
    
    expect(result).toEqual([]);
  });
});
```

### اختبارات الأداء
```sql
-- اختبار أداء الاستعلامات
EXPLAIN ANALYZE 
SELECT * FROM reporting.v_transaction_analytics 
WHERE entry_date BETWEEN '2025-01-01' AND '2025-12-31'
  AND project_name IS NOT NULL;
```

## 📈 مؤشرات الأداء المطلوبة

### الأهداف التقنية
- **زمن تحميل التقرير**: أقل من 5 ثوان للتقارير البسيطة
- **زمن تحميل التقرير المعقد**: أقل من 15 ثانية
- **دعم البيانات الكبيرة**: حتى مليون سجل
- **الاستجابة**: دعم كامل للأجهزة المحمولة

### مؤشرات المستخدم
- **سهولة الاستخدام**: واجهة بديهية باللغة العربية
- **المرونة**: إنشاء تقارير مخصصة في أقل من 5 دقائق
- **الموثوقية**: دقة البيانات 100%
- **التوفر**: 99.9% وقت تشغيل

## 🔧 إعدادات الإنتاج

### متغيرات البيئة
```bash
# إعدادات التقارير
REPORTS_MAX_ROWS=50000
REPORTS_CACHE_TTL=3600
REPORTS_EXPORT_PATH=/app/exports
REPORTS_EMAIL_FROM=reports@company.com

# إعدادات قاعدة البيانات
DB_MAX_CONNECTIONS=20
DB_QUERY_TIMEOUT=30000
```

### تحسين الأداء
```sql
-- إنشاء فهارس للأداء
CREATE INDEX idx_transactions_date_org ON transactions(entry_date, org_id) WHERE is_posted = true;
CREATE INDEX idx_transactions_project ON transactions(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_transactions_cost_center ON transactions(cost_center_id) WHERE cost_center_id IS NOT NULL;
CREATE INDEX idx_accounts_category ON accounts(category, org_id);
```

هذا الدليل يوفر إطار عمل شامل لتطوير نظام تقارير متقدم ومرن يلبي احتياجات التطبيق المحاسبي على مستوى المؤسسات.