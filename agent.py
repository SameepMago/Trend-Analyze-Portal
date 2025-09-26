"""
Mock Agent for Testing Trend Analysis Portal
Returns different response types based on input keywords for comprehensive testing
"""

import asyncio
import random
from typing import List, Dict, Any, Optional, Tuple

class TrendAgent:
    """Mock agent that returns different response types for testing"""
    
    def __init__(self):
        self.mock_data = {
            # Success cases - Trending programs
            "dune": {
                "title": "Dune: Part Two",
                "program_type": "movie",
                "release_year": 2024,
                "descriptions": [
                    "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
                    "The epic sequel to the 2021 Dune film, featuring stunning visuals and a stellar cast."
                ],
                "cast": ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin", "Stellan Skarsgård", "Dave Bautista"],
                "explanation_of_trend": "Latest blockbuster sequel with stellar cast and impressive box office performance. Trending due to recent release and strong critical reception.",
                "imdb_id": "tt15398776"
            },
            "oppenheimer": {
                "title": "Oppenheimer",
                "program_type": "movie", 
                "release_year": 2023,
                "descriptions": [
                    "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
                    "Christopher Nolan's biographical thriller about the father of the atomic bomb."
                ],
                "cast": ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr.", "Florence Pugh"],
                "explanation_of_trend": "Oscar-winning biopic that dominated awards season and box office. Trending due to recent Oscar wins and continued popularity.",
                "imdb_id": "tt34683290"
            },
            "wednesday": {
                "title": "Wednesday",
                "program_type": "show",
                "release_year": 2022,
                "descriptions": [
                    "Follows Wednesday Addams' years as a student at Nevermore Academy, where she attempts to master her emerging psychic ability.",
                    "A supernatural mystery comedy series based on the Addams Family characters."
                ],
                "cast": ["Jenna Ortega", "Gwendoline Christie", "Christina Ricci", "Catherine Zeta-Jones"],
                "explanation_of_trend": "Netflix's viral hit series with massive social media buzz. Trending due to viral dance scenes and strong fan following.",
                "imdb_id": "tt13443470"
            },
            
            # Success cases - Not trending programs
            "game of thrones": {
                "title": "Game of Thrones",
                "program_type": "show",
                "release_year": 2011,
                "descriptions": [
                    "Nine noble families fight for control over the mythical lands of Westeros.",
                    "A medieval fantasy drama series based on George R.R. Martin's novels."
                ],
                "cast": ["Emilia Clarke", "Kit Harington", "Peter Dinklage", "Lena Headey"],
                "explanation_of_trend": "Classic series, but not actively trending in the last 7 days. Ended in 2019 with no recent news or releases.",
                "imdb_id": "tt0944947"
            },
            "breaking bad": {
                "title": "Breaking Bad",
                "program_type": "show",
                "release_year": 2008,
                "descriptions": [
                    "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.",
                    "A crime drama series following Walter White's transformation into a drug kingpin."
                ],
                "cast": ["Bryan Cranston", "Aaron Paul", "Anna Gunn", "Dean Norris"],
                "explanation_of_trend": "Highly acclaimed series that ended in 2013. Not currently trending as there are no new episodes or related content.",
                "imdb_id": "tt0903747"
            },
            
            # Error cases - Agent errors
            "error": {
                "error": "Agent analysis failed: Unable to connect to search service",
                "error_type": "connection_error"
            },
            "timeout": {
                "error": "Agent analysis failed: Request timeout while searching for trends",
                "error_type": "timeout_error"
            },
            "invalid": {
                "error": "Agent analysis failed: Invalid input format provided",
                "error_type": "input_error"
            }
        }
    
    async def run(self, trend_list: List[str]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Mock agent run method that returns different response types based on keywords
        
        Args:
            trend_list: List of trend keywords
            
        Returns:
            Tuple of (selected_program, error_message)
        """
        # Simulate processing time
        await asyncio.sleep(random.uniform(1, 3))
        
        # Combine all keywords for matching
        combined_keywords = " ".join(trend_list).lower()
        
        # Check for specific test cases
        if "dune" in combined_keywords:
            return self.mock_data["dune"], None
            
        elif "oppenheimer" in combined_keywords:
            return self.mock_data["oppenheimer"], None
            
        elif "wednesday" in combined_keywords:
            return self.mock_data["wednesday"], None
            
        elif "game of thrones" in combined_keywords or "got" in combined_keywords:
            return self.mock_data["game of thrones"], None
            
        elif "breaking bad" in combined_keywords:
            return self.mock_data["breaking bad"], None
            
        elif "error" in combined_keywords:
            return None, self.mock_data["error"]["error"]
            
        elif "timeout" in combined_keywords:
            return None, self.mock_data["timeout"]["error"]
            
        elif "invalid" in combined_keywords:
            return None, self.mock_data["invalid"]["error"]
            
        elif "random" in combined_keywords or "gibberish" in combined_keywords:
            # Simulate no program found (but no error)
            return None, None
            
        else:
            # Default: randomly return a trending program or no result
            rand = random.random()
            if rand < 0.4:  # 40% chance of trending program
                trending_programs = ["dune", "oppenheimer", "wednesday"]
                selected = random.choice(trending_programs)
                return self.mock_data[selected], None
            elif rand < 0.7:  # 30% chance of not trending program
                not_trending_programs = ["game of thrones", "breaking bad"]
                selected = random.choice(not_trending_programs)
                return self.mock_data[selected], None
            else:  # 30% chance of no program found
                return None, None

# Test the mock agent
if __name__ == "__main__":
    async def test_mock_agent():
        agent = TrendAgent()
        
        test_cases = [
            ["dune", "movie"],
            ["oppenheimer", "nolan"],
            ["wednesday", "netflix"],
            ["game of thrones", "fantasy"],
            ["breaking bad", "crime"],
            ["error", "test"],
            ["timeout", "test"],
            ["invalid", "test"],
            ["random", "gibberish"],
            ["unknown", "keywords"]
        ]
        
        print("🧪 Testing Mock Agent...")
        print("=" * 50)
        
        for i, keywords in enumerate(test_cases, 1):
            print(f"\n{i}. Testing: {keywords}")
            program, error = await agent.run(keywords)
            
            if error:
                print(f"   ❌ Error: {error}")
            elif program:
                print(f"   ✅ Program: {program['title']} ({program['program_type']})")
                print(f"   📅 Year: {program['release_year']}")
                print(f"   🎭 Cast: {', '.join(program['cast'][:3])}...")
            else:
                print(f"   🔍 No program found")
    
    # Run the test
    asyncio.run(test_mock_agent())