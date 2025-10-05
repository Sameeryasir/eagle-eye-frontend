// --- Project Cache Usage Example (MCP Context 7) ---
// This file demonstrates how to use the new caching functionality in your components
// Follow these patterns for optimal performance and data consistency

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProjects,
  refreshProjects,
  createProject,
  updateProject,
  deleteProject,
  selectProjects,
  selectProjectLoading,
  selectProjectError,
  selectProjectCreating,
  selectProjectUpdating,
  selectProjectDeleting,
} from '../store/slices/projectSlice';

// --- Example Component: Project List ---
const ProjectList = () => {
  const dispatch = useDispatch();
  
  // Select data from Redux store
  const projects = useSelector(selectProjects);
  const loading = useSelector(selectProjectLoading);
  const error = useSelector(selectProjectError);
  const creating = useSelector(selectProjectCreating);
  const updating = useSelector(selectProjectUpdating);
  const deleting = useSelector(selectProjectDeleting);

  // --- Initial Data Loading (with cache) ---
  // This will use cached data if available and not expired
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // --- Handle Project Creation ---
  const handleCreateProject = async (projectData) => {
    try {
      await dispatch(createProject(projectData)).unwrap();
      // Cache is automatically cleared after successful creation
      // Next fetchProjects() call will get fresh data
      console.log('✅ Project created successfully');
    } catch (error) {
      console.error('❌ Failed to create project:', error);
    }
  };

  // --- Handle Project Update ---
  const handleUpdateProject = async (projectId, projectData) => {
    try {
      await dispatch(updateProject({ projectId, projectData })).unwrap();
      // Cache is automatically cleared after successful update
      console.log('✅ Project updated successfully');
    } catch (error) {
      console.error('❌ Failed to update project:', error);
    }
  };

  // --- Handle Project Deletion ---
  const handleDeleteProject = async (projectId) => {
    try {
      await dispatch(deleteProject(projectId)).unwrap();
      // Cache is automatically cleared after successful deletion
      console.log('✅ Project deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete project:', error);
    }
  };

  // --- Manual Refresh (bypass cache) ---
  // Use this when you need to force refresh data (e.g., pull-to-refresh)
  const handleRefresh = () => {
    dispatch(refreshProjects());
  };

  // --- Loading States ---
  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Projects</h2>
      
      {/* Manual refresh button */}
      <button onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Projects'}
      </button>
      
      {/* Project list */}
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            {project.name}
            <button 
              onClick={() => handleUpdateProject(project.id, { ...project, name: 'Updated Name' })}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
            <button 
              onClick={() => handleDeleteProject(project.id)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
      
      {/* Create project button */}
      <button 
        onClick={() => handleCreateProject({ name: 'New Project', description: 'Test project' })}
        disabled={creating}
      >
        {creating ? 'Creating...' : 'Create Project'}
      </button>
    </div>
  );
};

// --- Usage Notes (MCP Context 7) ---
/*
CACHING BEHAVIOR:

1. fetchProjects():
   - First checks cache for valid data (not expired)
   - If cache is valid, returns cached data immediately
   - If cache is expired/missing, fetches from API and caches result
   - Cache TTL: 10 minutes

2. refreshProjects():
   - Always bypasses cache
   - Fetches fresh data from API
   - Updates cache with new data
   - Use for pull-to-refresh or after external data changes

3. createProject/updateProject/deleteProject():
   - Performs the operation
   - Automatically clears cache
   - Next fetchProjects() will get fresh data

BEST PRACTICES:

1. Use fetchProjects() for initial load and normal data fetching
2. Use refreshProjects() for manual refresh (pull-to-refresh)
3. Cache is automatically managed - no manual cache clearing needed
4. All CRUD operations automatically invalidate cache
5. Loading states are available for all operations

PERFORMANCE BENEFITS:

- Faster initial loads (cached data)
- Reduced API calls
- Better offline experience
- Automatic cache invalidation ensures data consistency
*/

export default ProjectList;
