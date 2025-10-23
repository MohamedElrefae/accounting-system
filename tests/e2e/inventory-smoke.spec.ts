import { test, expect } from '@playwright/test'

// Minimal smoke: Verify Receive page renders and validation errors show on submit.
// This does not require backend data or authentication.

test.describe('Inventory Smoke', () => {
  test('Receive page renders and shows validation on submit', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/inventory/receive`)

    // Page heading present
    await expect(page.getByRole('heading', { name: /Receive Materials/i })).toBeVisible()

    // Click the submit button without filling fields
    await page.getByRole('button', { name: /Create, Approve & Post/i }).click()

    // Expect validation helper text for missing location and material at least
    await expect(page.getByText(/Select target location/i)).toBeVisible()
    await expect(page.getByText(/Invalid material|Select material/i)).toBeVisible()
  })
})
