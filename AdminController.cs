public JsonResult GetAllProjects()
{

    var model = _service.GetActiveProjects();

    return Json(model, JsonRequestBehavior.AllowGet);
}
#endregion

#region Assignments
[HttpGet]
public ActionResult Assignments()
{
    return View("Assignments");
}
#endregion