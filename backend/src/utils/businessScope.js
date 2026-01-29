// utils/businessScope.js
function requireBusiness(req, res, next) {
  if (!req.businessId && req.business && req.business._id) {
    req.businessId = req.business._id;
  }

  if (!req.businessId) {
    // This should only happen if authenticate didn't run
    return res.status(500).json({
      success: false,
      message: 'Business context is missing for this request'
    });
  }

  next();
}

/**
 * Returns a filter object ensuring queries are scoped to the current business.
 * Usage: Model.find(scopedFilter(req, { status: 'open' }))
 */
function scopedFilter(req, extra = {}) {
  return {
    businessId: req.businessId,
    ...extra
  };
}

module.exports = {
  requireBusiness,
  scopedFilter
};