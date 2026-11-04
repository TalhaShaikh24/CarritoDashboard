using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Admins";
            ViewBag.PageSubtitle = "Manage all registered admins";
            return View();
        }
    }
}
