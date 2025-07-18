import { Hono } from "hono"
import { cors } from "hono/cors"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { logger } from "hono/logger"
import { proxy } from "hono/proxy"
import fs from "node:fs"
import path from "node:path"
import yaml from "js-yaml"

// Define types for config
type ProxyConfig = {
  pathSegment: string
  target: string
  orHostname?: string
}

type Config = {
  proxies: ProxyConfig[]
}

// Function to load proxies from config file
const loadProxies = (): ProxyConfig[] => {
  const configPaths = [
    path.join(process.cwd(), "config.yaml"),
    path.join(process.cwd(), "config.yml"),
    path.join(process.cwd(), "config.json"),
  ]

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const fileContents = fs.readFileSync(configPath, "utf8")
        if (configPath.endsWith(".json")) {
          const config = JSON.parse(fileContents) as Config
          return config.proxies || []
        } else {
          const config = yaml.load(fileContents) as Config
          return config.proxies || []
        }
      } catch (error) {
        console.error(`Error loading or parsing config file at ${configPath}:`, error)
        return []
      }
    }
  }

  return [] // Return empty array if no config file is found
}

const app = new Hono()

app.use(cors())

app.use(logger())

app.use(async (c, next) => {
  await next()
  c.res.headers.set("X-Accel-Buffering", "no")
})

app.get("/", (c) => c.text("A proxy for AI!"))

const fetchWithTimeout = async (
  url: string,
  { timeout, ...options }: RequestInit & { timeout: number },
) => {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const res = await proxy(url, {
      ...options,
      signal: controller.signal,
      // @ts-expect-error
      duplex: "half",
    })
    clearTimeout(timeoutId)
    return res
  } catch (error) {
    clearTimeout(timeoutId)
    if (controller.signal.aborted) {
      return new Response("Request timeout", {
        status: 504,
      })
    }

    throw error
  }
}

const proxies: ProxyConfig[] = loadProxies()

app.post(
  "/custom-model-proxy",
  zValidator(
    "query",
    z.object({
      url: z.string().url(),
    }),
  ),
  async (c) => {
    const { url } = c.req.valid("query")

    const res = await proxy(url, {
      method: c.req.method,
      body: c.req.raw.body,
      headers: c.req.raw.headers,
    })

    return new Response(res.body, {
      headers: res.headers,
      status: res.status,
    })
  },
)

app.use(async (c, next) => {
  const url = new URL(c.req.url)

  const proxy = proxies.find(
    (p) =>
      url.pathname.startsWith(`/${p.pathSegment}/`) ||
      (p.orHostname && url.hostname === p.orHostname),
  )

  if (proxy) {
    const headers = new Headers()
    headers.set("host", new URL(proxy.target).hostname)

    c.req.raw.headers.forEach((value, key) => {
      const k = key.toLowerCase()
      if (
        !k.startsWith("cf-") &&
        !k.startsWith("x-forwarded-") &&
        !k.startsWith("cdn-") &&
        k !== "x-real-ip" &&
        k !== "host"
      ) {
        headers.set(key, value)
      }
    })

    const targetUrl = `${proxy.target}${url.pathname.replace(
      `/${proxy.pathSegment}/`,
      "/",
    )}${url.search}`

    const res = await fetchWithTimeout(targetUrl, {
      method: c.req.method,
      headers,
      body: c.req.raw.body,
      timeout: 60000,
    })

    return new Response(res.body, {
      headers: res.headers,
      status: res.status,
    })
  }

  next()
})

export default app
