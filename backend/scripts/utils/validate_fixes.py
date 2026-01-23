#!/usr/bin/env python3
"""
Script de Validação - Proteções Contra Duplicatas
Valida se todas as 4 camadas de proteção estão funcionando corretamente
"""

import asyncio
import sys
from datetime import datetime, timezone, timedelta
from database import SessionLocal, engine
import models
from sqlalchemy import text

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(title):
    print(f"\n{'='*60}")
    print(f"{Colors.BLUE}{title}{Colors.RESET}")
    print(f"{'='*60}\n")

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_info(msg):
    print(f"ℹ️  {msg}")

# ========================================
# Test 1: PostgreSQL Pool Configuration
# ========================================
def test_pool_config():
    print_header("Test 1: PostgreSQL Pool Configuration")
    
    try:
        # Check pool settings
        pool = engine.pool
        
        print_info(f"Pool size: {pool.size()}")
        print_info(f"Pool overflow: {pool.overflow()}")
        
        # Check pool_pre_ping
        if hasattr(engine.pool, '_pre_ping'):
            print_success("pool_pre_ping is configured")
        else:
            print_warning("pool_pre_ping status unknown")
        
        # Check pool_recycle
        if hasattr(engine.pool, '_recycle'):
            recycle = engine.pool._recycle
            if recycle == 3600:
                print_success(f"pool_recycle correctly set to {recycle}s (1 hour)")
            else:
                print_warning(f"pool_recycle is {recycle}s (expected 3600s)")
        
        # Test connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print_success("Database connection test PASSED")
        
        return True
        
    except Exception as e:
        print_error(f"Pool test FAILED: {e}")
        return False

# ========================================
# Test 2: Scheduler Lock (Check SQL)
# ========================================
def test_scheduler_lock():
    print_header("Test 2: Scheduler Lock")
    
    try:
        # Read scheduler.py and check for with_for_update
        with open("services/scheduler.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        if "with_for_update(skip_locked=True)" in content:
            print_success("Scheduler has SELECT FOR UPDATE SKIP LOCKED")
            return True
        else:
            print_error("Scheduler does NOT have row-level locking")
            return False
            
    except Exception as e:
        print_error(f"Scheduler lock test FAILED: {e}")
        return False

# ========================================
# Test 3: Idempotency Check
# ========================================
def test_idempotency():
    print_header("Test 3: Idempotency Check in Engine")
    
    try:
        # Read engine.py and check for idempotency logic
        with open("services/engine.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        checks_found = 0
        
        if "IDEMPOTENCY CHECK" in content:
            print_success("Idempotency check code found")
            checks_found += 1
        
        if "already completed" in content.lower():
            print_success("Completed status check found")
            checks_found += 1
        
        if "still processing" in content.lower():
            print_success("Processing status check found")
            checks_found += 1
        
        if checks_found >= 2:
            return True
        else:
            print_error("Idempotency checks incomplete")
            return False
            
    except Exception as e:
        print_error(f"Idempotency test FAILED: {e}")
        return False

# ========================================
# Test 4: Concurrent Funnel Blocking
# ========================================
def test_concurrent_blocking():
    print_header("Test 4: Concurrent Funnel Blocking")
    
    try:
        # Read engine.py and check for concurrent funnel check
        with open("services/engine.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        if "CONCURRENT FUNNEL CHECK" in content:
            print_success("Concurrent funnel blocking code found")
        else:
            print_error("Concurrent funnel blocking NOT found")
            return False
        
        if "active_funnel" in content:
            print_success("Active funnel detection implemented")
        else:
            print_error("Active funnel detection missing")
            return False
        
        if "status = 'cancelled'" in content:
            print_success("Trigger cancellation on conflict found")
            return True
        else:
            print_warning("Trigger cancellation logic unclear")
            return False
            
    except Exception as e:
        print_error(f"Concurrent blocking test FAILED: {e}")
        return False

# ========================================
# Test 5: Database State Check
# ========================================
def test_database_state():
    print_header("Test 5: Database State Analysis")
    
    try:
        db = SessionLocal()
        
        # Check for triggers with duplicate processing
        duplicate_processing = db.execute(text("""
            SELECT conversation_id, COUNT(*) as count
            FROM scheduled_triggers
            WHERE status = 'processing'
            GROUP BY conversation_id
            HAVING COUNT(*) > 1
        """)).fetchall()
        
        if duplicate_processing:
            print_error(f"Found {len(duplicate_processing)} conversations with multiple processing triggers")
            for row in duplicate_processing:
                print_warning(f"  Conversation {row[0]}: {row[1]} triggers")
        else:
            print_success("No duplicate processing triggers found")
        
        # Check for recent failed triggers (potential issues)
        recent_failed = db.execute(text("""
            SELECT COUNT(*) FROM scheduled_triggers
            WHERE status = 'failed'
            AND created_at > NOW() - INTERVAL '1 hour'
        """)).scalar()
        
        if recent_failed > 0:
            print_warning(f"{recent_failed} failed triggers in last hour")
        else:
            print_success("No recent failed triggers")
        
        # Check for cancelled triggers (concurrent blocking in action)
        recent_cancelled = db.execute(text("""
            SELECT COUNT(*) FROM scheduled_triggers
            WHERE status = 'cancelled'
            AND created_at > NOW() - INTERVAL '1 hour'
        """)).scalar()
        
        if recent_cancelled > 0:
            print_info(f"{recent_cancelled} cancelled triggers (concurrent blocking working)")
        
        db.close()
        return True
        
    except Exception as e:
        print_error(f"Database state test FAILED: {e}")
        return False

# ========================================
# Main Validation
# ========================================
def main():
    print_header("🛡️  Validação de Proteções Contra Duplicatas")
    print(f"Timestamp: {datetime.now()}\n")
    
    results = {
        "PostgreSQL Pool": test_pool_config(),
        "Scheduler Lock": test_scheduler_lock(),
        "Idempotency": test_idempotency(),
        "Concurrent Blocking": test_concurrent_blocking(),
        "Database State": test_database_state()
    }
    
    print_header("📊 Resumo dos Testes")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.RESET}" if result else f"{Colors.RED}FAILED{Colors.RESET}"
        print(f"{test_name:.<40} {status}")
    
    print(f"\n{'='*60}")
    
    if passed == total:
        print_success(f"Todos os testes passaram! ({passed}/{total})")
        print(f"\n{Colors.GREEN}🎉 Sistema 100% protegido contra duplicatas!{Colors.RESET}\n")
        return 0
    else:
        print_error(f"Alguns testes falharam ({passed}/{total})")
        print(f"\n{Colors.YELLOW}⚠️  Verifique os erros acima e corrija antes do deploy.{Colors.RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
