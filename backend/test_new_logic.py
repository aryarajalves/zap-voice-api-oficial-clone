
from datetime import datetime, timezone
from core.recurrent_logic import calculate_next_run

def test_monthly_specific_times():
    base = datetime(2026, 4, 1, 9, 0, tzinfo=timezone.utc) # Wed, April 1st
    
    # Test 1: Multiple days with different times
    day_of_month = [
        {'day': 1, 'time': '10:00'}, # Today, but later
        {'day': 15, 'time': '14:00'}
    ]
    
    next_run = calculate_next_run(base, 'monthly', day_of_month=day_of_month)
    print(f"Test 1 (Day 1 10:00 vs Day 15 14:00): Expected April 1st 10:00, Got {next_run}")
    assert next_run == datetime(2026, 4, 1, 10, 0, tzinfo=timezone.utc)

    # Test 2: Next available day is the earlier time in the same month
    base_late = datetime(2026, 4, 1, 11, 0, tzinfo=timezone.utc) # Today, after 10:00
    next_run_2 = calculate_next_run(base_late, 'monthly', day_of_month=day_of_month)
    print(f"Test 2 (After 10:00): Expected April 15th 14:00, Got {next_run_2}")
    assert next_run_2 == datetime(2026, 4, 15, 14, 0, tzinfo=timezone.utc)

    # Test 3: Mixed types (legacy compatibility)
    day_of_month_mixed = [1, {'day': 15, 'time': '14:00'}]
    next_run_3 = calculate_next_run(base, 'monthly', day_of_month=day_of_month_mixed, scheduled_time_str="08:00")
    # Day 1 at 08:00 (passed) vs Day 15 at 14:00
    print(f"Test 3 (Mixed): Expected April 15th 14:00, Got {next_run_3}")
    assert next_run_3 == datetime(2026, 4, 15, 14, 0, tzinfo=timezone.utc)

if __name__ == "__main__":
    try:
        test_monthly_specific_times()
        print("✅ Backend Logic Test Passed")
    except Exception as e:
        print(f"❌ Backend Logic Test Failed: {e}")
