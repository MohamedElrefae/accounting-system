import type { TourDefinition } from './types'

export const TOURS: TourDefinition[] = [
  {
    id: 'accounts_tree_edit',
    titleEn: 'Accounts Tree Editing',
    titleAr: 'تعديل شجرة الحسابات',
    steps: [
      {
        id: 'select_org_tree',
        target: '[data-tour="accounts-tree-org-select"]',
        titleEn: 'Select Organization',
        titleAr: 'اختر المؤسسة',
        bodyEn: 'First select an organization to load its chart of accounts.',
        bodyAr: 'أولاً اختر المؤسسة لتحميل شجرة حساباتها.',
        placement: 'bottom',
      },
      {
        id: 'add_account',
        target: '[data-tour="accounts-tree-add-top"]',
        titleEn: 'Add a New Account',
        titleAr: 'إضافة حساب جديد',
        bodyEn: 'Click here to add a new top-level account. You can also add sub accounts from inside the tree.',
        bodyAr: 'اضغط هنا لإضافة حساب جديد على المستوى الأعلى. يمكنك أيضاً إضافة حسابات فرعية من داخل الشجرة.',
        placement: 'bottom',
        media: [
          {
            type: 'image',
            titleEn: 'Add account button',
            titleAr: 'زر إضافة حساب',
            href: '/help/images/tours/accounts-add.png',
          },
          {
            type: 'pdf',
            titleEn: 'PDF: Accounts Tree',
            titleAr: 'PDF: شجرة الحسابات',
            href: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          },
        ],
      },
      {
        id: 'edit_selected',
        target: '[data-tour="accounts-tree-edit-selected"]',
        titleEn: 'Edit Selected Account',
        titleAr: 'تعديل الحساب المحدد',
        bodyEn: 'Select an account from the tree, then click Edit Selected to modify its name, code, or status.',
        bodyAr: 'اختر حساباً من الشجرة ثم اضغط تعديل الحساب المحدد لتعديل الاسم أو الكود أو الحالة.',
        placement: 'bottom',
      },
      {
        id: 'save_account',
        target: '[data-tour="accounts-tree-save"]',
        autoOpenTarget: '[data-tour="accounts-tree-add-top"]',
        titleEn: 'Save Changes',
        titleAr: 'حفظ التغييرات',
        bodyEn: 'After filling the form, click Save to apply the changes.',
        bodyAr: 'بعد تعبئة النموذج، اضغط حفظ لتطبيق التغييرات.',
        placement: 'bottom',
      },
    ],
  },
]

export function getTourById(id: string): TourDefinition | undefined {
  return TOURS.find(t => t.id === id)
}
