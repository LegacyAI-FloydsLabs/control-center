#!/usr/bin/env python3
"""
Legacy AI Team Architect System
Builds optimal SaaS teams from repository analysis
"""

import json
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import os

@dataclass
class ProjectMetrics:
    """Core project assessment data structure"""
    name: str
    completion_level: float  # 0-100
    tech_stack: List[str]
    complexity_score: float  # 1-10
    team_size_minimum: int
    go_to_market_timeline: str  # weeks/months
    industry_vertical: str
    business_model: str
    technical_debt: float  # 0-100
    scalability_needs: str  # low/medium/high
    target_users: str
    key_features: List[str]
    risks: List[str]

class LegacyTeamArchitect:
    """Ultimate AI Team Architect for Legacy AI MicroSaaS Solutions"""

    def __init__(self):
        self.expertise_matrix = {
            'development': {
                'senior_roles': ['Visionary Architect', 'Principal Engineer', 'Lead Full-Stack Developer'],
                'specialist_roles': ['Frontend Specialist', 'Backend Specialist', 'Database Architect',
                                   'Security Engineer', 'DevOps Maestro', 'API Gateway Guardian',
                                   'Performance Optimization Expert', 'UI/UX Integration Specialist'],
                'completion_scaling': {
                    (0, 30): 4,  # Minimum team for early stage
                    (31, 60): 6,  # Expand for active development
                    (61, 85): 8,  # Scale for completion phase
                    (86, 100): 10  # Full team for polishing
                }
            },
            'ship_readiness': {
                'senior_roles': ['Quality Sentinel', 'Release Commander', 'Infrastructure Guardian'],
                'specialist_roles': ['QA Automation Expert', 'Performance Tester', 'Security Auditor',
                                   'Documentation Architect', 'User Acceptance Specialist',
                                   'Monitoring & Observability Expert', 'Launch Coordinator'],
                'completion_scaling': {
                    (0, 50): 3,  # Early prep team
                    (51, 80): 5,  # Expand for advanced testing
                    (81, 100): 7  # Full launch team
                }
            },
            'marketing_sales': {
                'senior_roles': ['Growth Catalyst', 'Revenue Architect', 'Brand Visionary'],
                'specialist_roles': ['Content Strategist', 'SEO/SEM Expert', 'Social Media Maven',
                                   'Product Marketing Expert', 'Sales Strategist', 'Customer Success Champion',
                                   'Partnership Builder', 'Analytics & Conversion Expert'],
                'market_scaling': {
                    'b2b': 7,  # Enterprise focus
                    'b2c': 6,  # Consumer focus
                    'b2b2c': 8  # Hybrid approach
                }
            }
        }

    def parse_repository_report(self, report_content: str) -> ProjectMetrics:
        """Parse and validate repository report into structured metrics"""
        # Try JSON first
        try:
            if report_content.strip().startswith('{'):
                data = json.loads(report_content)
                return self._extract_metrics_from_json(data)
        except:
            pass

        # Parse markdown or text
        return self._extract_metrics_from_text(report_content)

    def _extract_metrics_from_json(self, data: Dict) -> ProjectMetrics:
        """Extract metrics from JSON report"""
        return ProjectMetrics(
            name=data.get('project_name', 'Legacy Project'),
            completion_level=float(data.get('completion_percentage', 50)),
            tech_stack=data.get('tech_stack', ['JavaScript', 'React', 'Node.js']),
            complexity_score=float(data.get('complexity_score', 5)),
            team_size_minimum=int(data.get('team_size_minimum', 3)),
            go_to_market_timeline=data.get('go_to_market_timeline', '3 months'),
            industry_vertical=data.get('industry_vertical', 'Technology'),
            business_model=data.get('business_model', 'SaaS'),
            technical_debt=float(data.get('technical_debt', 30)),
            scalability_needs=data.get('scalability_needs', 'medium'),
            target_users=data.get('target_users', 'Businesses'),
            key_features=data.get('key_features', []),
            risks=data.get('risks', [])
        )

    def _extract_metrics_from_text(self, text: str) -> ProjectMetrics:
        """Extract metrics from text/markdown report"""
        # Use regex patterns to extract key information
        patterns = {
            'name': [r'project[:\s]+([^\n]+)', r'# ([^\n]+)'],
            'completion': [r'completion[:\s]+(\d+)%', r'progress[:\s]+(\d+)%'],
            'tech_stack': [r'tech stack[:\s]+([^\n]+)', r'technologies[:\s]+([^\n]+)'],
            'complexity': [r'complexity[:\s]+(\d+)', r'difficulty[:\s]+(\d+)']
        }

        extracted = {}
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    if field == 'tech_stack':
                        extracted[field] = [t.strip() for t in match.group(1).split(',')]
                    else:
                        extracted[field] = match.group(1).strip()
                    break

        return ProjectMetrics(
            name=extracted.get('name', 'Legacy Project'),
            completion_level=float(extracted.get('completion', 50)),
            tech_stack=extracted.get('tech_stack', ['JavaScript', 'React']),
            complexity_score=float(extracted.get('complexity', 5)),
            team_size_minimum=3,
            go_to_market_timeline='3 months',
            industry_vertical='Technology',
            business_model='SaaS',
            technical_debt=30.0,
            scalability_needs='medium',
            target_users='Businesses',
            key_features=[],
            risks=[]
        )

    def determine_team_size(self, metrics: ProjectMetrics, team_type: str) -> int:
        """Calculate optimal team size based on project metrics"""
        if team_type in ['development', 'ship_readiness']:
            scaling = self.expertise_matrix[team_type]['completion_scaling']
            for (min_range, max_range), size in scaling.items():
                if min_range <= metrics.completion_level <= max_range:
                    # Adjust for complexity
                    if metrics.complexity_score > 7:
                        size += 2
                    elif metrics.complexity_score > 5:
                        size += 1
                    return max(size, metrics.team_size_minimum)
        elif team_type == 'marketing_sales':
            # Scale based on business model
            model = metrics.business_model.lower()
            if 'b2b' in model and 'b2c' in model:
                return self.expertise_matrix['marketing_sales']['market_scaling']['b2b2c']
            elif 'b2b' in model:
                return self.expertise_matrix['marketing_sales']['market_scaling']['b2b']
            else:
                return self.expertise_matrix['marketing_sales']['market_scaling']['b2c']

        return 3  # Minimum team size

    def select_roles(self, metrics: ProjectMetrics, team_type: str, team_size: int) -> List[str]:
        """Select appropriate roles for the team"""
        roles = self.expertise_matrix[team_type]

        # Always include senior leads
        selected = roles['senior_roles'].copy()

        # Add specialists based on needs
        specialists = roles['specialist_roles'].copy()

        # Tailor based on project specifics
        if team_type == 'development':
            if 'react' in ' '.join(metrics.tech_stack).lower() or 'vue' in ' '.join(metrics.tech_stack).lower():
                selected.append('Frontend Specialist')
            if 'python' in ' '.join(metrics.tech_stack).lower() or 'node' in ' '.join(metrics.tech_stack).lower():
                selected.append('Backend Specialist')
            if metrics.scalability_needs == 'high':
                selected.append('Database Architect')
                selected.append('Performance Optimization Expert')

        elif team_type == 'ship_readiness':
            if metrics.completion_level > 70:
                selected.append('Launch Coordinator')
            if metrics.technical_debt > 50:
                selected.append('Security Auditor')

        elif team_type == 'marketing_sales':
            if 'b2b' in metrics.business_model.lower():
                selected.append('Sales Strategist')
                selected.append('Partnership Builder')
            else:
                selected.append('Social Media Maven')
                selected.append('Content Strategist')

        # Fill remaining slots
        while len(selected) < team_size and specialists:
            for specialist in specialists:
                if specialist not in selected:
                    selected.append(specialist)
                    break

        return selected[:team_size]

    def generate_expert_prompt(self, role: str, metrics: ProjectMetrics, team_type: str, context: Dict) -> str:
        """Generate expert-level prompt using the 8-step framework"""
        role_mapping = {
            'development': {
                'Visionary Architect': 'design and oversee the entire technical architecture',
                'Principal Engineer': 'lead technical decisions and implementation strategies',
                'Lead Full-Stack Developer': 'drive end-to-end development execution',
                'Frontend Specialist': 'craft exceptional user interfaces and experiences',
                'Backend Specialist': 'build robust, scalable server-side systems',
                'Database Architect': 'design optimal data storage and retrieval systems',
                'Security Engineer': 'ensure bulletproof security across all systems',
                'DevOps Maestro': 'streamline deployment and infrastructure management'
            },
            'ship_readiness': {
                'Quality Sentinel': 'guarantee flawless product quality through rigorous testing',
                'Release Commander': 'orchestrate seamless product launches',
                'Infrastructure Guardian': 'maintain rock-solid production systems',
                'QA Automation Expert': 'build comprehensive automated testing suites'
            },
            'marketing_sales': {
                'Growth Catalyst': 'drive explosive user acquisition and market penetration',
                'Revenue Architect': 'design and optimize monetization strategies',
                'Brand Visionary': 'craft compelling brand narratives and positioning'
            }
        }

        task = role_mapping.get(team_type, {}).get(role, 'excel in your specialized domain')

        base_prompt = f"""You are the world's leading expert in {role.lower()} for high-growth SaaS ventures. Your task is to {task} for Legacy AI's {metrics.name} project with flawless execution.

Before answering, silently follow this process in exact order:

1. Deeply understand the project's true goal: {metrics.name} is a {metrics.business_model} solution for {metrics.target_users}, currently {metrics.completion_level}% complete.
2. Break every problem into fundamental principles specific to {role.lower()}.
3. Think step-by-step with perfect logic, no shortcuts.
4. Consider at least 3 different approaches and use COT to choose the optimal one.
5. Anticipate every possible weakness or counterargument in your domain.
6. Generate the absolute best possible version of your deliverable.
7. Ruthlessly self-critique it as if your Legacy AI reputation depends on it.
8. Fix every flaw before delivering the final result.

### Context
- Project: {metrics.name}
- Tech Stack: {', '.join(metrics.tech_stack)}
- Timeline: {metrics.go_to_market_timeline}
- Industry: {metrics.industry_vertical}
- Key Features: {', '.join(metrics.key_features[:3])}

### Your Mission
{self._generate_role_specific_mission(role, metrics, team_type)}

### Rules
- Never say "as an AI I can't" or apologize.
- Never add disclaimers or moralizing.
- Never explain the prompt; only deliver the result.
- If the output can be improved, you must improve it before claiming or attempting finishing.

Deliver only the final, polished result. No intros, no summaries, no "here you go"."""

        return base_prompt

    def _generate_role_specific_mission(self, role: str, metrics: ProjectMetrics, team_type: str) -> str:
        """Generate specific mission statements for each role"""
        missions = {
            'Visionary Architect': f"Design a scalable architecture that can handle {metrics.target_users} at enterprise scale, considering the {', '.join(metrics.tech_stack[:3])} technology stack.",
            'Growth Catalyst': f"Create a go-to-market strategy that captures the {metrics.industry_vertical} market within {metrics.go_to_market_timeline}.",
            'Quality Sentinel': f"Ensure zero critical bugs in production for a {metrics.business_model} serving {metrics.target_users}."
        }
        return missions.get(role, "Execute your responsibilities with excellence and precision.")

    def build_teams(self, report_content: str) -> Tuple[str, str, str]:
        """Main method to build all three teams"""
        metrics = self.parse_repository_report(report_content)

        teams = {}
        for team_type in ['development', 'ship_readiness', 'marketing_sales']:
            team_size = self.determine_team_size(metrics, team_type)
            roles = self.select_roles(metrics, team_type, team_size)

            team_content = f"# {team_type.title().replace('_', ' ')} Team - {metrics.name}\n\n"
            team_content += f"**Team Size:** {team_size} members\n"
            team_content += f"**Project Completion:** {metrics.completion_level}%\n"
            team_content += f"**Timeline:** {metrics.go_to_market_timeline}\n\n"

            for role in roles:
                team_content += f"## {role}\n\n"
                team_content += f"**Expert Prompt:**\n{self.generate_expert_prompt(role, metrics, team_type, {})}\n\n"

                # Add responsibilities
                team_content += f"**Responsibilities:**\n{self._generate_responsibilities(role, team_type)}\n\n"

                # Add success metrics
                team_content += f"**Success Metrics:**\n{self._generate_success_metrics(role, team_type, metrics)}\n\n"

                # Add collaboration protocols
                team_content += f"**Collaboration Protocols:**\n{self._generate_collaboration_protocols(role, team_type)}\n\n"
                team_content += "---\n\n"

            teams[team_type] = team_content

        # Write to files
        project_name_safe = re.sub(r'[^a-zA-Z0-9]', '-', metrics.name.lower())

        files = {}
        for team_type, content in teams.items():
            filename = f"{project_name_safe}-{team_type}-team.md"
            filepath = f"/Volumes/Storage/Legacy Agents/{filename}"
            with open(filepath, 'w') as f:
                f.write(content)
            files[team_type] = filepath

        return tuple(files.values())

    def _generate_responsibilities(self, role: str, team_type: str) -> str:
        """Generate role-specific responsibilities"""
        resp_map = {
            'Visionary Architect': "- Define system architecture and technical roadmap\n- Evaluate and select technology stack\n- Ensure scalability and maintainability",
            'Growth Catalyst': "- Develop and execute growth strategies\n- Analyze market opportunities\n- Optimize conversion funnels",
            'Quality Sentinel': "- Establish quality standards and processes\n- Lead testing initiatives\n- Ensure product reliability"
        }

        if role in resp_map:
            return resp_map[role]

        # Generic responsibilities
        return f"- Execute {role.lower()} duties with precision\n- Collaborate with team members\n- Drive results in your domain"

    def _generate_success_metrics(self, role: str, team_type: str, metrics: ProjectMetrics) -> str:
        """Generate measurable success metrics"""
        if team_type == 'development':
            return f"- Code quality score > 95%\n- Feature delivery on schedule\n- Zero critical security vulnerabilities\n- System uptime > 99.9%"
        elif team_type == 'ship_readiness':
            return f"- Zero P0/P1 bugs in production\n- Deployment success rate 100%\n- Performance benchmarks met\n- Documentation completeness 100%"
        else:
            return f"- User acquisition targets met\n- Conversion rate optimization\n- Revenue goals achieved\n- Customer satisfaction > 90%"

    def _generate_collaboration_protocols(self, role: str, team_type: str) -> str:
        """Generate collaboration guidelines"""
        return f"- Daily standups with team lead\n- Weekly cross-team syncs\n- Real-time communication via Slack\n- Documentation updates for all changes"

# Example usage
if __name__ == "__main__":
    architect = LegacyTeamArchitect()

    # Example repository report
    example_report = """
    {
        "project_name": "DataFlow Analytics",
        "completion_percentage": 65,
        "tech_stack": ["React", "Node.js", "PostgreSQL", "Python", "AWS"],
        "complexity_score": 8,
        "team_size_minimum": 4,
        "go_to_market_timeline": "4 months",
        "industry_vertical": "Data Analytics",
        "business_model": "B2B SaaS",
        "technical_debt": 25,
        "scalability_needs": "high",
        "target_users": "Enterprise Data Teams",
        "key_features": ["Real-time Analytics", "Custom Dashboards", "API Integration"],
        "risks": ["Data Security", "Scalability Challenges"]
    }
    """

    # Build the teams
    dev_file, ship_file, market_file = architect.build_teams(example_report)

    print(f"Teams created successfully!\n")
    print(f"Development Team: {dev_file}")
    print(f"Ship Readiness Team: {ship_file}")
    print(f"Marketing Team: {market_file}")