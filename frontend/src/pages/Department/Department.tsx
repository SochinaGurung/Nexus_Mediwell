import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { departmentService, type Department } from '../../services/departmentService'
import './Department.css'

export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pagination, setPagination] = useState<{
    currentPage: number
    totalPages: number
    totalDepartments: number
    departmentsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  } | null>(null)

  const departmentsPerPage = 8

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await departmentService.getAllDepartments({
        isActive: true,
        search: searchTerm || undefined,
        page: currentPage,
        limit: departmentsPerPage
      })
      setDepartments(response.departments)
      setPagination(response.pagination)
    } catch (err: unknown) {
      const errorMessage =
        (err as { message?: string })?.message ||
        'Failed to load departments. Please try again later.'
      setError(errorMessage)
      console.error('Error fetching departments:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch departments when page changes
  useEffect(() => {
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  // Debounce search and reset to page 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        fetchDepartments()
      }
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  return (
    <>
      <Header />
      <div className="department-page">
        <div className="department-container">
          {/* Header Section */}
          <div className="department-header">
            <h1>Our Departments</h1>
            <p>Explore our specialized medical departments and world-class healthcare services</p>
            
            {/* Search Bar */}
            <div className="search-bar">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 19L14.65 14.65"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading departments...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-container">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16H12.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p>{error}</p>
              <button onClick={fetchDepartments} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Departments Grid */}
          {!loading && !error && (
            <>
              {departments.length === 0 ? (
                <div className="no-departments">
                  <p>No departments found.</p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="clear-search-btn">
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="departments-count">
                    <p>
                      {pagination ? (
                        <>
                          Showing <strong>{(currentPage - 1) * departmentsPerPage + 1}</strong> to{' '}
                          <strong>
                            {Math.min(currentPage * departmentsPerPage, pagination.totalDepartments)}
                          </strong>{' '}
                          of <strong>{pagination.totalDepartments}</strong> department
                          {pagination.totalDepartments !== 1 ? 's' : ''}
                        </>
                      ) : (
                        <>
                          Showing <strong>{departments.length}</strong> department
                          {departments.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="departments-grid">
                    {departments.map((dept) => {
                      const deptId = dept.id || dept._id || ''
                      return (
                      <div key={deptId} className="department-card">
                        {dept.departmentCode && (
                          <span className="department-code">{dept.departmentCode}</span>
                        )}
                        <h3>{dept.departmentName}</h3>
                        <p className="department-description">{dept.description}</p>
                        <div className="department-card-footer">
                          <Link to={`/departments/${deptId}`} className="view-details-btn">
                            View Details
                          </Link>
                        </div>
                      </div>
                    )})}
                  </div>
                  
                  {/* Pagination Controls */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="pagination-container">
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={!pagination.hasPrevPage || loading}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10 12L6 8L10 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Previous
                      </button>
                      
                      <div className="pagination-pages">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === pagination.totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                className={`pagination-page-btn ${page === currentPage ? 'active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                                disabled={loading}
                              >
                                {page}
                              </button>
                            )
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="pagination-ellipsis">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>
                      
                      <button
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                        disabled={!pagination.hasNextPage || loading}
                      >
                        Next
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6 4L10 8L6 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
