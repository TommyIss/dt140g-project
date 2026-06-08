public List<object> GetActiveProjects()
{
    DateTime today = DateTime.Today;
    List<object> activeProjects = new List<object>();
    try
    {
        
        List<Project> projects = _db.Projects.Where(p => p.EndDate > today && p.IsActive == true).ToList();
        

        var projectsIds = projects.Select(p => p.ProjectID).ToList();

        List<ConsultantProject> consultantsProjects = _db.ConsultantProjects.Where(cp => projectsIds.Contains(cp.refProjectID.Value)).Include(cp => cp.Consultant).ToList();

        var customerIds = projects.Where(p => p.refCustomerID.HasValue).Select(p => p.refCustomerID.Value).Distinct().ToList();

        List<Customer> customers = _db.Customers.Where(c => customerIds.Contains(c.CustomerID)).ToList();

        activeProjects = projects.Select(project => new
        {
            ProjectID = project.ProjectID,
            ProjectName = project.Name,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            CustomerName = customers.FirstOrDefault(c => c.CustomerID == project.refCustomerID)?.Name ?? "No customer",
            Consultant = consultantsProjects.Where(cp => cp.refProjectID == project.ProjectID).Select(cp => new
            {
                ConsultantID = cp.Consultant.ConsultantID,
                FirstName = cp.Consultant.FirstName,
                LastName = cp.Consultant.LastName
            }).ToList()
        }).Cast<object>().ToList();

        return activeProjects;
    }
    catch (Exception ex)
    {
        _log.Error(ex);
    }

    return activeProjects;
}