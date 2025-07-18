# AI Proxy

This is a simple proxy for AI services.

## Sponsorship

This project is sponsored by [ChatWise](https://chatwise.app), the fastest AI chatbot that works for any LLM.

## Usage

Replace your API domain with the domain of the proxy deployed on your server. For example:

- Gemini:
  - from `https://generativelanguage.googleapis.com/v1beta` 
  - to`https://your-proxy/generativelanguage/v1beta`
- OpenAI:
  - from `https://api.openai.com/v1`
  - to `https://your-proxy/openai/v1`
- Anthropic:
  - from `https://api.anthropic.com/v1`
  - to `https://your-proxy/anthropic/v1`
- Groq:
  - from `https://api.groq.com/openai/v1`
  - to `https://your-proxy/groq/openai/v1`
- Perplexity:
  - from `https://api.perplexity.ai`
  - to `https://your-proxy/pplx`
- Mistral:
  - from `https://api.mistral.ai`
  - to `https://your-proxy/mistral`
- OpenRouter:
  - from `https://openrouter.ai/api`
  - to `https://your-proxy/openrouter`
- xAI:
  - from `https://api.xai.ai`
  - to `https://your-proxy/xai`
 
## Hosted by ChatWise

Use the hosted API, for example OpenAI `https://ai-proxy.chatwise.app/openai/v1`

## Deployment

Deploy this as a Docker container, check out [Dockerfile](./Dockerfile).

## Configuration

The proxy rules are loaded from a configuration file. You can create `config.yaml`, `config.yml`, or `config.json` in the root directory of the project. A `config.yaml` example is provided.

The application will look for these files in order, and use the first one it finds. If no configuration file is found, the proxy will run with no rules.

This allows you to change proxy rules without rebuilding the Docker image.

## License

MIT.

## Docker

To build the Docker image, run:
```bash
docker build -t ai-proxy .
```

To run the container and mount a local configuration file, use the `-v` flag. This is the recommended way to run the proxy, as it allows you to update the configuration without rebuilding the image.

Create a `config.yaml` file on your host machine, then run the following command:

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  --name ai-proxy \
  ai-proxy
```

After making changes to your local `config.yaml`, you only need to restart the container for the changes to take effect:
```bash
docker restart ai-proxy
```