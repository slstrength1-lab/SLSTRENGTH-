# claude-agents

The AI agent roster that helps run the program. Each subfolder defines one agent's role, responsibilities, and how it hands work to others. `master-coordinator` is the entry point that routes work to the right specialist agent — start there if you're unsure which agent should own a task.

| Agent | Role |
|---|---|
| `master-coordinator/` | Routes requests to the right specialist agent and reconciles their outputs |
| `director-of-performance/` | Program-level strategy and cross-discipline decisions |
| `strength-coach/` | Strength & conditioning programming |
| `sports-scientist/` | Data analysis, load monitoring, testing protocols |
| `nutritionist/` | Meal planning, macros, supplement guidance |
| `recovery/` | Sleep, recovery modalities, injury-risk monitoring |
| `recruiting/` | Prospect evaluation and recruiting communication |
| `content-creator/` | Social/marketing content for the program |
| `video-analysis/` | Film breakdown and movement analysis |
| `coding-assistant/` | Builds and maintains this repository and its tooling |

Day-to-day usage notes for these agents live in `/performance-os/agents`. Reusable prompts they draw on live in `/prompt-library`.
