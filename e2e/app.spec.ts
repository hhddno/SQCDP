import { test, expect } from '@playwright/test'
import { APP_ROUTES, DEMO_ROUTES } from '../src/lib/routes'

test('landing page is public', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Pilotez votre usine/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Essayer la démo interactive/i })).toBeVisible()
})

test('public demo loads monthly dashboard', async ({ page }) => {
  await page.goto(DEMO_ROUTES.mois)
  await expect(page.getByText(/Mode démo/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'SQCDP' })).toBeVisible()
  await expect(page.getByText(/Tableau de bord mensuel/i)).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Mois', exact: true })).toBeVisible()
})

test('demo home shows usine dupont', async ({ page }) => {
  await page.goto(DEMO_ROUTES.home)
  await expect(page.getByRole('heading', { name: 'SQCDP' })).toBeVisible()
  await expect(page.locator('main').getByText('Usine Dupont')).toBeVisible()
})

test('app home loads with SQCDP title', async ({ page }) => {
  await page.goto(APP_ROUTES.home)
  await expect(page.getByRole('heading', { name: 'SQCDP' })).toBeVisible()
})

test('week view loads in demo', async ({ page }) => {
  await page.goto(DEMO_ROUTES.semaine)
  await expect(page.getByText(/Semaine du/)).toBeVisible()
})
