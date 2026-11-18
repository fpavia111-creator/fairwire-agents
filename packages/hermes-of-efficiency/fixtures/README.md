# Hermes fixtures

Fictional AI usage. Model names and prices are made up for the demo (large-model-x, small-model-y); they are not any provider's prices.

- `usage.csv`: 23 requests. support-bot sends one prompt six times with no cache hit (a seventh copy hit the cache). doc-summarizer sends three 80,000-token contracts, one 900 KB payload, and three answers stop at the output limit. code-helper sends eight tiny requests to the large model. Three requests have no app tag.
- `settings.json`: the made-up price table and which model counts as large.
