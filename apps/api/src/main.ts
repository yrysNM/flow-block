import { createApp } from './nest-on-express'

async function main(): Promise<void> {
  const app = await createApp()
  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port, '0.0.0.0')
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
