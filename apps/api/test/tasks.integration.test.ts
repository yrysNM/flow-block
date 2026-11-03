import { afterAll, describe, expect, it } from 'vitest'

/**
 * Full register → create task → list tasks against PostgreSQL.
 *
 * This file is skipped unless FOCUSFLOW_INTEGRATION=1. This environment has
 * no Docker daemon and no local Postgres, so the suite was not executed here.
 * Run it with the Compose database up:
 *
 *   docker compose -f infrastructure/docker-compose.yml up -d
 *   npm run prisma:migrate -w @focusflow/api
 *   FOCUSFLOW_INTEGRATION=1 npm run test -w @focusflow/api
 */
const enabled = process.env.FOCUSFLOW_INTEGRATION === '1'

describe.skipIf(!enabled)('task API integration', () => {
  let close: (() => Promise<void>) | undefined

  afterAll(async () => {
    await close?.()
  })

  it('registers, creates a task, and lists only that user’s tasks', async () => {
    const { createApp } = await import('../src/nest-on-express')
    const request = (await import('supertest')).default
    const app = await createApp()
    await app.init()
    close = () => app.close()
    const server = app.getHttpServer()
    const email = `slice-${Date.now()}@example.com`

    const register = await request(server)
      .post('/api/auth/register')
      .send({ email, password: 'longenough', name: 'Slice' })
    expect(register.status).toBe(201)
    const cookie = register.headers['set-cookie']
    expect(cookie).toBeTruthy()

    const created = await request(server)
      .post('/api/tasks')
      .set('Cookie', cookie)
      .send({ title: 'Integration task', isUrgent: true, isImportant: false })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('TODO')
    expect(created.body.quadrant).toBe('DELEGATE')

    const listed = await request(server).get('/api/tasks').set('Cookie', cookie)
    expect(listed.status).toBe(200)
    expect(listed.body.data).toEqual([
      expect.objectContaining({ title: 'Integration task', quadrant: 'DELEGATE' }),
    ])

    const outsider = await request(server).get('/api/tasks')
    expect(outsider.status).toBe(401)
  })
})
