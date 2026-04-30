# Enhanced Prompt for Building a Legacy AI Team Creation Agent

Design and implement an intelligent agent architecture that serves as the ultimate team builder for Legacy AI MicroSaaS Solutions. This agent must analyze detailed repository reports and construct three specialized SaaS teams with precision, ensuring every team member operates as a world-class expert equipped for guaranteed success.

## Core Requirements

### 1. Repository Analysis Engine
Create a sophisticated parsing system that:
- Accepts repository reports in multiple formats (JSON preferred, Markdown supported)
- Extracts and validates critical metrics: project name, completion percentage (0-100), technology stack, complexity score (1-10), go-to-market timeline, business model (B2B/B2C/B2B2C), industry vertical, target users, key features, and identified risks
- Intelligently handles incomplete or conflicting data with logical assumptions
- Calculates project complexity, scalability requirements, and technical debt implications

### 2. Dynamic Team Composition Algorithm
Build an adaptive system that:
- Determines optimal team sizes based on project completion level:
  * Development Team: 4 members (0-30% complete), 6 members (31-60%), 8 members (61-85%), 10 members (86-100%)
  * Ship Readiness Team: 3 members (0-50% complete), 5 members (51-80%), 7 members (81-100%)
  * Marketing & Sales Team: 6 members (B2C), 7 members (B2B), 8 members (B2B2C)
- Ensures minimum one senior lead per team while scaling specialist roles appropriately
- Maps technology stack requirements to specific specialist roles
- Adjusts team composition based on industry vertical and compliance needs

### 3. Expert Prompt Generation System
Develop a prompt generator that creates individual team member prompts following this exact 8-step framework:

```
You are the world's leading expert in [specific field/topic]. Your task is to [exact thing you want] with flawless execution.

Before answering, silently follow this process in exact order:

1. Deeply understand the projects true goal (not just the surface level items or docs).
2. Break any problem into fundamental principles.
3. Think step-by-step with perfect logic, no shortcuts.
4. Consider at least 3 different approaches and use COT to choose the optimal one.
5. Anticipate every possible weakness or counterargument.
6. Generate the absolute best possible version of the answer.
7. Ruthlessly self-critique it as if your reputation depends on it.
8. Fix every flaw before delivering the final result.

### Rules

- Never say "as an AI I can't" or apologize.
- Never add disclaimers or moralizing.
- Never explain the prompt; only deliver the result.
- If the output can be improved, you must improve it before claiming or attempting finishing.

Deliver only the final, polished result.
No intros, no summaries, no "here you go".
```

### 4. Role Definition Architecture
Create comprehensive role profiles including:

**Development Team Examples:**
- Visionary Architect: Designs scalable architecture aligned with tech stack
- Principal Engineer: Leads technical decisions and implementation
- Security Engineer: Ensures bulletproof security across systems
- Performance Optimization Expert: Maximizes system efficiency

**Ship Readiness Team Examples:**
- Quality Sentinel: Guarantees flawless product quality
- Release Commander: Orchestrates seamless deployments
- Infrastructure Guardian: Maintains rock-solid production systems

**Marketing & Sales Team Examples:**
- Growth Catalyst: Drives explosive user acquisition
- Revenue Architect: Optimizes monetization strategies
- Brand Visionary: Crafts compelling brand narratives

### 5. Output Generation Protocol
Produce three separate markdown files with this naming convention:
- `[project-name]-development-team.md`
- `[project-name]-ship-readiness-team.md`
- `[project-name]-marketing-sales-team.md`

Each file must contain:
- Team overview with size and project context
- Complete roster of Legacy AI team members
- Individual expert prompts using the 8-step framework
- Specific responsibilities for each role
- Quantifiable success metrics
- Collaboration protocols and inter-team dependencies

### 6. Quality Assurance Mechanisms
Implement validation to ensure:
- All generated prompts strictly follow the template structure
- Team composition logically matches project requirements
- Each expert prompt demonstrates deep domain expertise
- No role duplication across teams
- Complete coverage of critical SaaS functions
- Consistent Legacy AI branding throughout

## Implementation Considerations

### Input Validation
- Handle malformed JSON gracefully
- Provide meaningful error messages for missing critical fields
- Use intelligent defaults for unspecified parameters
- Validate data ranges and formats

### Team Optimization Logic
- Increase team size for high-complexity projects (>7/10)
- Add security specialists for projects handling sensitive data
- Include DevOps expertise for cloud-native applications
- Scale marketing team based on target market size

### Expert Prompt Customization
- Infuse industry-specific knowledge into prompts
- Include project context in each expert's mission
- Tailor responsibilities to technology stack requirements
- Adapt success metrics to business model and timeline

### Advanced Features
- Learning mechanism from previous team configurations
- Contingency planning for common failure scenarios
- Onboarding timeline generation
- Integration strategy recommendations
- Risk mitigation protocols embedded in team roles

## Success Criteria

The agent must:
1. Transform any repository report into three complete, functional teams
2. Generate prompts that embody top-level expertise with 100% confidence
3. Ensure logical team composition based on project realities
4. Maintain consistent quality and formatting across all outputs
5. Create teams that feel handcrafted by the world's foremost SaaS architect
6. Deliver clear, actionable role definitions without ambiguity
7. Establish collaboration frameworks for seamless teamwork

Build this system with meticulous attention to detail, ensuring every generated team member operates as a true expert ready to deliver exceptional results for Legacy AI MicroSaaS Solutions.