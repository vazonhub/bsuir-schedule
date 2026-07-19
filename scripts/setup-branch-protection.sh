#!/usr/bin/env bash
# Настраивает branch protection (rulesets) для master / testing / develop.
#
# ⚠️ Требования:
#   - gh CLI, авторизованный с правами admin на репозиторий (gh auth login);
#   - репозиторий публичный ИЛИ организация на платном плане GitHub
#     (на приватных репо Free-плана rulesets недоступны).
#
# Идемпотентность: если ruleset с таким именем уже есть — он обновляется.

set -euo pipefail

REPO="${1:-vazonhub/bsuir-schedule}"

CI_CHECK="Format / Lint / Types / Tests"
VERSION_CHECK="Version matches PR title"

# upsert_ruleset <name> <json>
upsert_ruleset() {
  local name="$1" body="$2" existing_id
  existing_id=$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$name\") | .id" 2>/dev/null || true)
  if [ -n "$existing_id" ]; then
    echo "→ обновляю ruleset «${name}» (id $existing_id)"
    echo "$body" | gh api -X PUT "repos/$REPO/rulesets/$existing_id" --input - >/dev/null
  else
    echo "→ создаю ruleset «${name}»"
    echo "$body" | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
  fi
}

# master: только PR, оба обязательных чека, линейная история, без удаления/force-push.
upsert_ruleset "protect-master" "$(cat <<JSON
{
  "name": "protect-master",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/master"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "$CI_CHECK" },
          { "context": "$VERSION_CHECK" }
        ]
      }
    }
  ]
}
JSON
)"

# testing: только PR (Release vX.Y.Z из develop), оба чека.
upsert_ruleset "protect-testing" "$(cat <<JSON
{
  "name": "protect-testing",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/testing"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "$CI_CHECK" },
          { "context": "$VERSION_CHECK" }
        ]
      }
    }
  ]
}
JSON
)"

# develop: только PR + CI-чек (версию тут не сверяем).
upsert_ruleset "protect-develop" "$(cat <<JSON
{
  "name": "protect-develop",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/develop"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "$CI_CHECK" }
        ]
      }
    }
  ]
}
JSON
)"

echo "✓ Rulesets применены к $REPO"
