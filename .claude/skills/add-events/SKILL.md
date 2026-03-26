---
name: add-events
description: Add new historical events to the timeline game. Use when adding events, understanding event data structure, or checking for duplicates.
---

# Adding Historical Events

## Event JSON Structure

Each event is a JSON object with these fields:

```json
{
  "name": "battle-of-marathon",
  "friendly_name": "Battle of Marathon",
  "year": -490,
  "category": "conflict",
  "description": "Athenian forces defeated the Persian invasion, inspiring the marathon race legend.",
  "difficulty": "medium",
  "image_url": "https://upload.wikimedia.org/...",
  "image_width": 330,
  "image_height": 216
}
```

### Required Fields

| Field           | Type   | Description                                                                               |
| --------------- | ------ | ----------------------------------------------------------------------------------------- |
| `name`          | string | Unique kebab-case ID (e.g., `battle-of-marathon`). Must be unique across ALL event files. |
| `friendly_name` | string | Display name in Title Case (e.g., "Battle of Marathon")                                   |
| `year`          | number | Year of event. **Negative = BCE** (e.g., -490 = 490 BCE), positive = CE                   |
| `category`      | string | One of the six categories below                                                           |
| `description`   | string | 1-2 sentences, 80-150 characters. Factual, objective tone.                                |
| `difficulty`    | string | `easy`, `medium`, or `hard`                                                               |

### Optional Fields

| Field          | Type   | Description                                |
| -------------- | ------ | ------------------------------------------ |
| `image_url`    | string | Wikimedia Commons URL (prefer 330px width) |
| `image_width`  | number | Image width in pixels (typically 330)      |
| `image_height` | number | Image height in pixels                     |

## Categories

Events are stored in separate JSON files by category in `public/events/`:

| Category         | File                | Use For                                                 |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `conflict`       | conflict.json       | Wars, battles, military events, revolts                 |
| `cultural`       | cultural.json       | Art, literature, philosophy, religion, social movements |
| `diplomatic`     | diplomatic.json     | Treaties, political agreements, empires founded, laws   |
| `disasters`      | disasters.json      | Natural disasters, plagues, extinctions, catastrophes   |
| `exploration`    | exploration.json    | Scientific discoveries, exploration, domestication      |
| `infrastructure` | infrastructure.json | Buildings, monuments, engineering, construction         |
| `inventions`     | inventions.json     | Inventions, patents, technological firsts, tools        |

## Difficulty Guidelines

| Level    | Description                             | Examples                                          |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `easy`   | Well-known events most people recognize | Pyramids, Moon landing, World War II              |
| `medium` | Moderately known historical events      | Battle of Marathon, Magna Carta                   |
| `hard`   | Specialized/obscure knowledge           | Ur-Nammu's Code, Lex Hortensia, Battle of Carrhae |

## Era Reference

Events are automatically assigned to eras based on `year`:

| Era         | Year Range               |
| ----------- | ------------------------ |
| Prehistory  | -4,500,000,000 to -3,001 |
| Ancient     | -3,000 to 499            |
| Medieval    | 500 to 1,499             |
| Renaissance | 1,500 to 1,759           |
| Industrial  | 1,760 to 1,913           |
| World Wars  | 1,914 to 1,945           |
| Cold War    | 1,946 to 1,991           |
| Modern      | 1,992 to 2,100           |

## Workflow for Adding Events

### 1. Check for Duplicates First

Before adding, search existing events:

```bash
# Search by name pattern
grep -r "battle-of" public/events/

# Search by year
grep -r '"year": -490' public/events/

# Run duplicate checker
npm run find-duplicates
```

### 2. Determine Category

Choose the **primary** nature of the event:

- Military action → `conflict`
- Political/legal → `diplomatic`
- Religious/artistic/philosophical → `cultural`
- Scientific discovery/exploration → `exploration`
- Building/monument → `infrastructure`
- Natural disaster/plague → `disasters`
- Inventions/patents/new technologies → `inventions`

### 3. Add Event to Correct File

Append to the appropriate `public/events/*.json` file. Maintain valid JSON array format.

### 4. Verify After Adding

```bash
npm run find-duplicates  # Check for duplicate names
npm run build            # Verify JSON is valid
```

## Naming Conventions

### `name` field (kebab-case ID)

- Use lowercase with hyphens: `battle-of-thermopylae`
- Be descriptive and unique: `death-alexander-great` not just `alexander`
- Common prefixes: `battle-`, `treaty-of-`, `invention-of-`, `birth-`, `death-`

### `friendly_name` (display name)

- Title Case: "Battle of Thermopylae"
- Can include verbs: "Completed", "Begins", "Founded", "Signed"
- Keep concise: 2-6 words typical

### `description` conventions

- Factual, objective tone
- 1-2 sentences
- Include key figures, locations, or significance
- No speculation or editorializing

## Examples by Category

### Conflict

```json
{
  "name": "battle-of-marathon",
  "friendly_name": "Battle of Marathon",
  "year": -490,
  "category": "conflict",
  "description": "Athenian forces defeated the Persian invasion, inspiring the marathon race legend.",
  "difficulty": "medium"
}
```

### Cultural

```json
{
  "name": "birth-buddha",
  "friendly_name": "Birth of Siddhartha Gautama",
  "year": -563,
  "category": "cultural",
  "description": "The future Buddha was born a prince in Nepal, destined to found a world religion.",
  "difficulty": "medium"
}
```

### Diplomatic

```json
{
  "name": "magna-carta",
  "friendly_name": "Magna Carta Signed",
  "year": 1215,
  "category": "diplomatic",
  "description": "English barons forced King John to sign a charter limiting royal power.",
  "difficulty": "easy"
}
```

### Disasters

```json
{
  "name": "vesuvius-eruption",
  "friendly_name": "Mount Vesuvius Erupts",
  "year": 79,
  "category": "disasters",
  "description": "The volcanic eruption buried Pompeii and Herculaneum, preserving them for millennia.",
  "difficulty": "easy"
}
```

### Exploration

```json
{
  "name": "first-moon-landing",
  "friendly_name": "First Moon Landing",
  "year": 1969,
  "category": "exploration",
  "description": "Apollo 11 astronauts became the first humans to walk on the Moon.",
  "difficulty": "easy"
}
```

### Infrastructure

```json
{
  "name": "great-wall-begins",
  "friendly_name": "Great Wall Construction Begins",
  "year": -221,
  "category": "infrastructure",
  "description": "Qin Shi Huang began connecting existing walls into the Great Wall of China.",
  "difficulty": "medium"
}
```

## Common Mistakes to Avoid

1. **Duplicate names** - Always search before adding
2. **Wrong year sign** - BCE years must be negative
3. **Category mismatch** - A battle goes in `conflict`, not `diplomatic`
4. **Too long descriptions** - Keep under 150 characters
5. **Invalid JSON** - Missing commas, unclosed brackets
6. **Non-unique names** - `name` field must be globally unique
