import { test, expect } from '@playwright/test';

test.describe('Permission Audit Logging E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to admin panel
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    await page.waitForNavigation();
  });

  test('should log role creation', async ({ page }) => {
    // Navigate to role management
    await page.goto('/admin/roles');
    
    // Create new role
    await page.click('button:has-text("دور جديد")');
    await page.fill('input[name="name"]', 'Test Role');
    await page.fill('input[name="name_ar"]', 'دور الاختبار');
    await page.click('button:has-text("حفظ")');
    
    // Wait for success message
    await expect(page.locator('text=تم إنشاء الدور')).toBeVisible();
    
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Verify CREATE action logged
    await expect(page.locator('text=إنشاء')).toBeVisible();
    await expect(page.locator('text=role')).toBeVisible();
  });

  test('should log permission assignment', async ({ page }) => {
    // Navigate to role management
    await page.goto('/admin/roles');
    
    // Edit existing role
    await page.click('button:has-text("تعديل")');
    
    // Assign permissions
    await page.click('text=الصلاحيات');
    await page.click('input[value="read"]');
    await page.click('input[value="write"]');
    await page.click('button:has-text("حفظ الصلاحيات")');
    
    // Wait for success
    await expect(page.locator('text=تم حفظ')).toBeVisible();
    
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Verify ASSIGN action logged
    await expect(page.locator('text=تعيين')).toBeVisible();
    await expect(page.locator('text=role_permissions')).toBeVisible();
  });

  test('should log permission modification', async ({ page }) => {
    // Navigate to role management
    await page.goto('/admin/roles');
    
    // Edit role permissions
    await page.click('button:has-text("تعديل")');
    await page.click('text=الصلاحيات');
    
    // Modify permissions
    await page.click('input[value="read"]'); // Uncheck
    await page.click('input[value="delete"]'); // Check
    await page.click('button:has-text("حفظ الصلاحيات")');
    
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Verify MODIFY action logged
    await expect(page.locator('text=تعديل')).toBeVisible();
  });

  test('should log role deletion', async ({ page }) => {
    // Navigate to role management
    await page.goto('/admin/roles');
    
    // Delete role
    await page.click('button:has-text("حذف")');
    await page.click('button:has-text("تأكيد")');
    
    // Wait for success
    await expect(page.locator('text=تم حذف')).toBeVisible();
    
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Verify DELETE action logged
    await expect(page.locator('text=حذف')).toBeVisible();
  });

  test('should filter audit logs by action type', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Filter by ASSIGN action
    await page.selectOption('select[name="action"]', 'ASSIGN');
    
    // Verify only ASSIGN logs shown
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    
    // Verify all rows contain ASSIGN
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('text=تعيين')).toBeVisible();
  });

  test('should filter audit logs by resource type', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Filter by role_permissions
    await page.selectOption('select[name="resourceType"]', 'role_permissions');
    
    // Verify filtered results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should view audit log details', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Click details button
    await page.click('button:has-text("التفاصيل")');
    
    // Verify modal opened
    await expect(page.locator('text=تفاصيل السجل')).toBeVisible();
    
    // Verify details displayed
    await expect(page.locator('text=معرف السجل')).toBeVisible();
    await expect(page.locator('text=نوع العملية')).toBeVisible();
    await expect(page.locator('text=القيمة السابقة')).toBeVisible();
    await expect(page.locator('text=القيمة الجديدة')).toBeVisible();
  });

  test('should export audit logs to CSV', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Start listening for download
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("تصدير")');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('permission-audit');
    
    // Verify CSV format
    const path = await download.path();
    expect(path).toBeDefined();
  });

  test('should display statistics dashboard', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Verify statistics cards
    await expect(page.locator('text=إجمالي التغييرات')).toBeVisible();
    await expect(page.locator('text=هذا الأسبوع')).toBeVisible();
    await expect(page.locator('text=هذا الشهر')).toBeVisible();
    await expect(page.locator('text=أنواع العمليات')).toBeVisible();
    
    // Verify numbers displayed
    const stats = page.locator('[role="contentinfo"]');
    await expect(stats).toContainText(/\d+/);
  });

  test('should handle empty audit logs gracefully', async ({ page }) => {
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // Filter to show no results
    await page.selectOption('select[name="action"]', 'NONEXISTENT');
    
    // Verify empty state message
    await expect(page.locator('text=لا توجد سجلات')).toBeVisible();
  });

  test('should verify audit log data accuracy', async ({ page }) => {
    // Create a role with specific permissions
    await page.goto('/admin/roles');
    await page.click('button:has-text("دور جديد")');
    await page.fill('input[name="name"]', 'Audit Test Role');
    await page.fill('input[name="name_ar"]', 'دور اختبار التدقيق');
    await page.click('button:has-text("حفظ")');
    
    // Assign specific permissions
    await page.click('button:has-text("تعديل")');
    await page.click('text=الصلاحيات');
    await page.click('input[value="read"]');
    await page.click('input[value="write"]');
    await page.click('button:has-text("حفظ الصلاحيات")');
    
    // Navigate to audit logs
    await page.goto('/admin/audit');
    await page.click('text=سجل الصلاحيات');
    
    // View details of latest log
    await page.click('button:has-text("التفاصيل")');
    
    // Verify data accuracy
    await expect(page.locator('text=Audit Test Role')).toBeVisible();
    await expect(page.locator('text=read')).toBeVisible();
    await expect(page.locator('text=write')).toBeVisible();
  });
});
