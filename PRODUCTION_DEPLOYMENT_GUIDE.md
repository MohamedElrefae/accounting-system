# Production Deployment Guide - Enterprise Fiscal Dashboard

## Pre-Deployment Checklist

### 1. Database Preparation
```bash
# Run the stack depth fix script
psql -h your-db-host -U your-user -d your-db -f database-stack-depth-fix.sql

# Verify the fix
psql -h your-db-host -U your-user -d your-db -c "SELECT * FROM fiscal_years_health_check;"
```

### 2. Environment Configuration
```env
# Production environment variables
NODE_ENV=production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL=error
```

### 3. Build Verification
```bash
# Clean build
npm run clean
npm ci
npm run build

# Verify build output
# Windows
dir dist
# Linux/Mac
ls -la dist/
```

## Deployment Steps

### Step 1: Database Migration
```sql
-- Verify current state
SELECT COUNT(*) FROM fiscal_years;
SELECT * FROM pg_policies WHERE tablename = 'fiscal_years';

-- Apply optimizations if needed
\i database-stack-depth-fix.sql
```

### Step 2: Application Deployment
```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, AWS, etc.)
```

### Step 3: Verification Tests
```bash
# Health check
curl https://your-domain.com/health

# API test
curl "https://your-supabase-url/rest/v1/fiscal_years?select=id&limit=1" \
  -H "apikey: your-anon-key"
```

## Post-Deployment Monitoring

### 1. Application Metrics
- Response times < 500ms (p95)
- Error rate < 1%
- Uptime > 99.9%

### 2. Database Performance
```sql
-- Monitor query performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%fiscal_years%'
ORDER BY total_time DESC;
```

### 3. User Experience
- Page load time < 2 seconds
- Time to interactive < 3 seconds
- No JavaScript errors in production

## Rollback Plan

### If Issues Occur:
1. **Immediate**: Revert to previous deployment
2. **Database**: Restore from backup if needed
3. **Monitoring**: Check logs and metrics
4. **Communication**: Notify stakeholders

### Rollback Commands:
```bash
# Revert deployment
git revert HEAD
npm run build
# Deploy previous version

# Database rollback (if needed)
psql -f backup-restore.sql
```

## Success Criteria

✅ **Functional Requirements**
- All CRUD operations work correctly
- Error handling displays appropriate messages
- Bilingual support functions properly
- Permissions are enforced correctly

✅ **Performance Requirements**
- Dashboard loads in < 2 seconds
- Database queries complete in < 500ms
- No stack depth errors occur
- Memory usage remains stable

✅ **Security Requirements**
- RLS policies are active and working
- User authentication is enforced
- Data access is properly restricted
- No sensitive data in client logs

## Support Information

### Technical Contacts
- **Database Issues**: DBA Team
- **Application Issues**: Frontend Team  
- **Infrastructure**: DevOps Team

### Monitoring Dashboards
- Application: [Your monitoring URL]
- Database: [Your DB monitoring URL]
- Infrastructure: [Your infra monitoring URL]

### Emergency Procedures
1. Check application logs
2. Verify database connectivity
3. Review recent deployments
4. Contact on-call engineer if needed

---

**Deployment Status**: ✅ Ready for Production  
**Last Updated**: [Current Date]  
**Version**: 1.0.0