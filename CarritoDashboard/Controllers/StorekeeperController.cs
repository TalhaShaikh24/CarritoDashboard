using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class StorekeeperController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Storekeepers";
            ViewBag.PageSubtitle = "Manage all registered storekeepers";
            return View();
        }
    }
}
