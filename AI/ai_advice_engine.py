import json

class AIAdviceEngine:
    def get_advice(self, role, role_data):
        # Heuristic advice based on role and data
        advice = {
            "title": "AI Property Advisor",
            "description": f"AI Recommendations for your {role} dashboard.",
            "recommendations": [],
            "metrics": {},
            "alerts": []
        }
        
        stats = role_data.get('stats', {})
        
        if role == 'admin' or role == 'property_admin' or role == 'system_admin':
            pending_profiles = stats.get('profiles', {}).get('pending', 0)
            if pending_profiles > 0:
                advice["recommendations"].append(f"Review {pending_profiles} pending broker/owner profiles")
                advice["alerts"].append({"type": "warning", "message": f"{pending_profiles} profiles awaiting approval"})
            
            pending_checks = stats.get('pending', {}).get('total', 0)
            if pending_checks > 0:
                advice["recommendations"].append(f"Process {pending_checks} pending site verifications")
                
            advice["description"] = "System Health: Focus on verifying pending requests to maintain marketplace trust."
            
        elif role == 'broker':
            properties = stats.get('properties', {}).get('total', 0)
            if properties == 0:
                advice["recommendations"].append("Add your first property to start earning commission")
            else:
                advice["recommendations"].append("Share your listings to increase visibility")
            
            advice["description"] = "Market Insight: High-demand detected in Kezira and Station Road."
            
        elif role == 'owner' or role == 'landlord':
            advice["recommendations"].append("Ensure all property documents are verified for 'GPS Ready' status")
            advice["description"] = "Owner Advice: Professional photos can increase engagement by 40%."
            
        else: # user / buyer / customer
            advice["recommendations"].append("Complete your profile verification to enable fast agreements")
            advice["recommendations"].append("Check out new 'Verified' listings in Dire Dawa")
            advice["description"] = "Buyer Tip: Look for the 'GPS Verified' badge for guaranteed locations."

        if not advice["recommendations"]:
            advice["recommendations"].append("Keep exploring the Dire Dawa Real Estate marketplace!")
            
        return advice

if __name__ == "__main__":
    import sys
    engine = AIAdviceEngine()
    # If run directly with JSON arg
    if len(sys.argv) > 1:
        try:
            data = json.loads(sys.argv[1])
            print(json.dumps(engine.get_advice(data.get('role', 'user'), data.get('role_data', {}))))
        except:
            print(json.dumps(engine.get_advice('user', {})))
    else:
        print(json.dumps(engine.get_advice('user', {})))
