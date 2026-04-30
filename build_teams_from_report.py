#!/usr/bin/env python3
"""
Quick script to build teams from a repository report
"""

import json
from legacy_team_architect import LegacyTeamArchitect

def main():
    # Initialize the architect
    architect = LegacyTeamArchitect()

    # Get repository report from user
    print("=== Legacy AI Team Builder ===\n")
    print("Paste your repository report (JSON or Markdown format)")
    print("Press Enter on an empty line when finished:\n")

    lines = []
    while True:
        line = input()
        if line == "" and len(lines) > 0:
            break
        lines.append(line)

    report_content = "\n".join(lines)

    print("\n⚡ Analyzing repository and building teams...\n")

    # Build the teams
    try:
        dev_file, ship_file, market_file = architect.build_teams(report_content)

        print("✅ Teams created successfully!\n")
        print("=" * 50)
        print(f"📁 Development Team: {dev_file}")
        print(f"🚢 Ship Readiness Team: {ship_file}")
        print(f"📈 Marketing & Sales Team: {market_file}")
        print("=" * 50)
        print("\nEach team member has been configured as a top-level expert")
        print("with the knowledge and tools to succeed with 100% confidence.")
        print("\nAll teams include senior leads and are optimized for your")
        print("specific project requirements and completion level.")

    except Exception as e:
        print(f"❌ Error building teams: {str(e)}")
        print("\nPlease ensure your report includes at minimum:")
        print("- Project name")
        print("- Completion percentage")
        print("- Technology stack")
        print("- Business model (B2B/B2C)")

if __name__ == "__main__":
    main()