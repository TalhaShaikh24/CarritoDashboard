using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class ActivityLogController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Activity Log";
            ViewBag.PageSubtitle = "Monitor user operations, authentication, and system events";
            return View();
        }
    }
}
