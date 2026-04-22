
from database import SessionLocal
import models
import re
import sqlalchemy

def aggressive_clean(p):
    if not p: return ""
    p = str(p)
    # Remove everything inside parentheses if it contains any digit and a currency marker
    # Format: (R$ 147), ($10), (10€), etc.
    res = re.sub(r'\s*\([^)]*?[\d\.,\s]+(R\$|\$|€|£|BRL|USD|EUR|US\$)[^)]*?\)', '', p)
    res = re.sub(r'\s*\([^)]*?(R\$|\$|€|£|BRL|USD|EUR|US\$)[\d\.,\s]+[^)]*?\)', '', res)
    
    # Remove price markers and numbers: " - R$ 49.00", " R$ 49"
    res = re.sub(r'\s*-?\s*(R\$|\$|€|£|BRL|USD|EUR|US\$)\s*[\d\.,]+', '', res)
    
    return res.strip()

def migrate():
    db = SessionLocal()
    try:
        integrations = db.query(models.WebhookIntegration).all()
        for integration in integrations:
            if not integration.discovered_products:
                continue
                
            print(f">>> Processing Integration: {integration.id} (Slug: {integration.custom_slug})")
            old_list = list(integration.discovered_products)
            new_set = set()
            
            for raw_item in old_list:
                print(f"  Raw Item: '{raw_item}'")
                # SPLIT BY PIPE ALWAYS
                parts = [pt.strip() for pt in str(raw_item).split('|')]
                for part in parts:
                    if not part: continue
                    cleaned = aggressive_clean(part)
                    print(f"    Sub-part: '{part}' -> Cleaned: '{cleaned}'")
                    if cleaned:
                        new_set.add(cleaned)
            
            new_list = sorted(list(new_set))
            if new_list != old_list:
                print(f"  [CHANGE DETECTED]")
                integration.discovered_products = new_list
                sqlalchemy.orm.attributes.flag_modified(integration, "discovered_products")
                
                if integration.product_whitelist:
                    w_old = list(integration.product_whitelist)
                    w_new = set()
                    for item in w_old:
                        parts = [pt.strip() for pt in str(item).split('|')]
                        for part in parts:
                            cleaned = aggressive_clean(part)
                            if cleaned:
                                w_new.add(cleaned)
                    integration.product_whitelist = sorted(list(w_new))
                    sqlalchemy.orm.attributes.flag_modified(integration, "product_whitelist")
                
                db.add(integration)
                print(f"  Successfully updated integration {integration.id}")
            else:
                print(f"  No changes needed.")
        
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
