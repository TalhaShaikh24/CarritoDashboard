using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class PermissionController : Controller
    {
        public IActionResult Index()
        {
            ViewData["ActiveController"] = "Permission";
            ViewData["ActiveAction"] = "Index";
            return View();
        }
    }
}
