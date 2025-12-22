# Disaster Recovery Runbook
## Accounting System - Emergency Procedures

**Last Updated**: December 19, 2025  
**Status**: ✅ Production Ready

---

## 📋 Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | 2 hours | Maximum time to restore service |
| **RPO** (Recovery Point Objective) | 24 hours | Maximum acceptable data loss |
| **Backup Retention** | 30 days | Daily backups maintained |

---

## 🔴 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Database Administrator | [TBD] | [Phone/Email] |
| CTO / Technical Lead | [TBD] | [Phone/Email] |
| Client Emergency | [TBD] | [Phone/Email] |
| Supabase Support | N/A | support@supabase.io |

---

## 🚨 Incident Classification

### Severity 1 - Critical (Immediate Response)
- Complete system outage
- Data breach or security incident
- Database corruption
- Financial data integrity issues

### Severity 2 - High (Response within 1 hour)
- Partial system outage
- Performance degradation > 50%
- Authentication failures
- RLS policy failures

### Severity 3 - Medium (Response within 4 hours)
- Minor feature unavailable
- Performance degradation < 50%
- Non-critical errors

---

## 📖 Recovery Procedures

### Procedure 1: Database Corruption Recovery

**Symptoms**:
- Application errors mentioning database
- Data inconsistencies
- Query failures

**Steps**:

```bash
# 1. Alert stakeholders immediately
# Send notification to emergency contacts

# 2. Set maintenance mode (if available)
# Update application status page

# 3. Identify latest clean backup
# Go to Supabase Dashboard > Settings > Backups
# Note the timestamp of the last successful backup

# 4. Create new database instance (if needed)
# Supabase Dashboard > New Project (for complete rebuild)

# 5. Restore from backup
# Supabase Dashboard > Settings > Backups > Restore
# Select the backup timestamp before corruption

# 6. Verify data integrity
```

```sql
-- Run data integrity checks
SELECT 
  'transactions' as table_name,
  COUNT(*) as row_count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM transactions
UNION ALL
SELECT 
  'accounts',
  COUNT(*),
  MIN(created_at),
  MAX(created_at)
FROM accounts
UNION ALL
SELECT 
  'transaction_lines',
  COUNT(*),
  MIN(created_at),
  MAX(created_at)
FROM transaction_lines;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_lines
FROM transaction_lines tl
LEFT JOIN transactions t ON t.id = tl.transaction_id
WHERE t.id IS NULL;

-- Verify audit log continuity
SELECT DATE(created_at) as date, COUNT(*) as audit_count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

```bash
# 7. Notify users when restored
# Update status page
# Send notification email
```

---

### Procedure 2: RLS Policy Failure

**Symptoms**:
- Users seeing other organizations' data
- Permission denied errors for valid operations
- Cross-tenant data leakage

**Steps**:

```sql
-- 1. EMERGENCY: Disable RLS temporarily (ONLY if critical)
-- This exposes all data - use with extreme caution
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- ... repeat for affected tables

-- 2. Investigate the issue
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Check helper functions
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname IN ('is_super_admin', 'has_permission', 'fn_is_org_member');

-- 4. Test RLS with specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM transactions LIMIT 5;

-- 5. Re-enable RLS after fix
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

---

### Procedure 3: Authentication System Failure

**Symptoms**:
- Users cannot log in
- Session errors
- Token refresh failures

**Steps**:

```bash
# 1. Check Supabase Auth status
# Go to Supabase Dashboard > Authentication > Users
# Verify auth service is responding

# 2. Check for rate limiting
# Dashboard > Authentication > Rate Limits

# 3. Verify environment variables
# Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct

# 4. Clear browser storage (for affected users)
# localStorage.clear()
# sessionStorage.clear()
# Clear cookies

# 5. If Supabase Auth is down, wait for Supabase status update
# https://status.supabase.com/
```

---

### Procedure 4: Complete System Outage

**Steps**:

```bash
# 1. Identify the cause
# - Check Vercel status: https://www.vercel-status.com/
# - Check Supabase status: https://status.supabase.com/
# - Check DNS: nslookup your-domain.com

# 2. If Vercel is down
# - Wait for Vercel to restore service
# - Consider temporary redirect to status page

# 3. If Supabase is down
# - Application will show connection errors
# - Wait for Supabase to restore service
# - No action possible on our end

# 4. If our code is the issue
# - Rollback to previous deployment
# Vercel Dashboard > Deployments > Select previous > Promote to Production

# 5. Post-incident
# - Document timeline
# - Identify root cause
# - Implement preventive measures
```

---

## 🔄 Backup Procedures

### Manual Backup (Before Major Changes)

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or via Dashboard
# Supabase Dashboard > Settings > Backups > Download
```

### Verify Backup Integrity

```sql
-- After restoring to test environment
-- Run these checks:

-- 1. Row counts match expected
SELECT 
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM accounts) as accounts,
  (SELECT COUNT(*) FROM transaction_lines) as lines,
  (SELECT COUNT(*) FROM organizations) as orgs;

-- 2. No data corruption
SELECT COUNT(*) as invalid_amounts
FROM transaction_lines
WHERE debit_amount < 0 OR credit_amount < 0;

-- 3. Referential integrity
SELECT COUNT(*) as orphaned_records
FROM transaction_lines tl
WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = tl.transaction_id);
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | > 2000ms | Investigate performance |
| Error Rate | > 1% | Check error logs |
| Database Connections | > 80% | Scale or optimize |
| Storage Usage | > 90% | Expand storage |

### Supabase Dashboard Checks

1. **Database Health**: Dashboard > Database > Health
2. **API Logs**: Dashboard > Logs > API
3. **Auth Logs**: Dashboard > Authentication > Logs
4. **Storage Usage**: Dashboard > Storage

---

## 📝 Post-Incident Checklist

After any incident:

- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] List affected users/data
- [ ] Implement preventive measures
- [ ] Update this runbook if needed
- [ ] Conduct post-mortem meeting
- [ ] Notify stakeholders of resolution

---

## 🔐 Security Incident Response

### If Data Breach Suspected

1. **Immediately**:
   - Disable affected user accounts
   - Rotate API keys if compromised
   - Enable additional logging

2. **Within 1 hour**:
   - Assess scope of breach
   - Identify affected data
   - Document evidence

3. **Within 24 hours**:
   - Notify affected users (if required)
   - Report to relevant authorities (if required)
   - Implement additional security measures

### Rotate Supabase Keys

```bash
# 1. Go to Supabase Dashboard > Settings > API
# 2. Generate new anon key
# 3. Update environment variables in Vercel
# 4. Redeploy application
# 5. Verify application works with new keys
```

---

## 📞 Escalation Path

```
Level 1: On-call Developer
    ↓ (15 min no response)
Level 2: Technical Lead
    ↓ (30 min no resolution)
Level 3: CTO / Management
    ↓ (Critical incidents)
Level 4: External Support (Supabase/Vercel)
```

---

## 🗓️ Regular Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check backup status
- [ ] Monitor storage usage

### Monthly
- [ ] Test backup restoration
- [ ] Review access logs
- [ ] Update dependencies
- [ ] Security audit

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Update this runbook
- [ ] Review and rotate credentials

---

**Document Owner**: Technical Team  
**Review Frequency**: Monthly  
**Next Review Date**: January 19, 2026
