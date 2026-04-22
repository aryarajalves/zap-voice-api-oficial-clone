
import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.recurrent_logic import calculate_next_run

def test_recurrence():
    # Base: Monday 10:00 UTC
    base = datetime(2023, 1, 2, 10, 0, tzinfo=timezone.utc)
    
    print(f"Base date: {base} (Monday)")
    
    # Test 1: Weekly, same day but later time
    # Monday=0
    next_run = calculate_next_run(base, 'weekly', days_of_week=[0], scheduled_time_str="15:00")
    print(f"Test 1 (Weekly, Mon 15:00): {next_run}")
    assert next_run.weekday() == 0 and next_run.hour == 15
    
    # Test 2: Weekly, same day but earlier time (should be next week)
    next_run = calculate_next_run(base, 'weekly', days_of_week=[0], scheduled_time_str="08:00")
    print(f"Test 2 (Weekly, Mon 08:00): {next_run}")
    assert next_run.weekday() == 0 and next_run.day == 9 # next monday
    
    # Test 3: Weekly, Tuesday (next day)
    next_run = calculate_next_run(base, 'weekly', days_of_week=[1], scheduled_time_str="09:00")
    print(f"Test 3 (Weekly, Tue 09:00): {next_run}")
    assert next_run.weekday() == 1 and next_run.day == 3
    
    # Test 4: Monthly, same month
    next_run = calculate_next_run(base, 'monthly', day_of_month=15, scheduled_time_str="09:00")
    print(f"Test 4 (Monthly, 15th): {next_run}")
    assert next_run.month == 1 and next_run.day == 15
    
    # Test 5: Monthly, next month
    next_run = calculate_next_run(base, 'monthly', day_of_month=1, scheduled_time_str="09:00")
    print(f"Test 5 (Monthly, 1st): {next_run}")
    assert next_run.month == 2 and next_run.day == 1
    
    print("\n✅ All logic tests passed!")

if __name__ == "__main__":
    test_recurrence()
