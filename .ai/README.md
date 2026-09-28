# AI Software Company Protocol

This directory contains persistent handoff artifacts shared between autonomous teams.

## Principles

- Team communication must not depend only on conversation context.
- Important decisions must be persisted as artifacts.
- Humans remain approval gates between Product and Development.
- Agents must not silently change the status of artifacts owned by another authority.
- Product defines what and why.
- Development defines how.
- Human approval controls when Product work may enter Development and when Development may enter main.

## Directory Structure

    .ai/
    ├── product/
    │   ├── questions/
    │   └── decisions/
    ├── development/
    │   └── tasks/
    └── state/

## Product Questions

Development may create:

    .ai/product/questions/PQ-<id>-<slug>.md

A Product Question must contain:

    ID:
    Status:
    Source:
    Related task:
    Created:

    Question:
    Why it matters:
    Options:
    Technical impact:
    Blocking:

Valid Product Question statuses:

    OPEN
    ANSWERED

Development must not mark a question ANSWERED itself.

## Product Decisions

Product Team creates:

    .ai/product/decisions/PD-<id>-<slug>.md

Required fields:

    ID:
    Status:
    Source:
    Related question:
    Created:

    Question:
    Decision:
    Rationale:
    Requirements:
    Acceptance criteria:
    UX behavior:
    Technical constraints:
    Edge cases:
    Out of scope:
    Evidence:
    Open questions:

Product Team may create a decision with:

    READY_FOR_HUMAN_REVIEW

Product Team must NOT mark its own decision:

    APPROVED_FOR_DEVELOPMENT

That status belongs to the human.

## Product Approval Gate

The allowed transition is:

    READY_FOR_HUMAN_REVIEW
              ↓
            HUMAN
              ↓
    APPROVED_FOR_DEVELOPMENT

Only explicit human approval may authorize this transition.

Messages such as:

    ok
    continue
    looks good

are not sufficient.

Approval must explicitly identify the Product Decision.

Example:

    Approve PD-002 for development.

## Development Tasks

After a Product Decision has status:

    APPROVED_FOR_DEVELOPMENT

Dev Team may create:

    .ai/development/tasks/DEV-<id>-<slug>.md

The task must reference the Product Decision.

Required fields:

    ID:
    Status:
    Product decision:
    Branch:
    Created:

    Objective:
    Requirements:
    Acceptance criteria:
    Implementation:
    Commits:
    Review:
    Tests:
    Build:
    Human testing:

Development task statuses:

    READY
    IN_PROGRESS
    BLOCKED
    HUMAN_TESTING
    MERGED

## Development Gate

Dev Team may autonomously move:

    READY
      ↓
    IN_PROGRESS
      ↓
    HUMAN_TESTING

Dev Team must STOP at:

    HUMAN_TESTING

Only explicit human authorization may allow the corresponding branch to merge into main.

## Product Questions During Development

If Development discovers a new product ambiguity:

    Development
         ↓
    PRODUCT_QUESTION
         ↓
    .ai/product/questions/PQ-xxx.md
         ↓
    Product Team
         ↓
    .ai/product/decisions/PD-xxx.md
         ↓
    HUMAN REVIEW
         ↓
    Development resumes

A blocking Product Question places the Development task into:

    BLOCKED

until an approved Product Decision resolves it.

## Authority

Product Team owns:

- product analysis
- requirements
- acceptance criteria
- UX behavior
- product decision artifacts

Dev Team owns:

- implementation
- technical execution
- agent branches
- commits
- tests
- builds
- development task artifacts

Human owns:

- APPROVED_FOR_DEVELOPMENT
- merge authorization
- production release authorization
- production deployment authorization

No agent may impersonate human approval.
