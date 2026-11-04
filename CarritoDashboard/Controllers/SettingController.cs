using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class SettingController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Settings";
            ViewBag.PageSubtitle = "Manage settings";
            return View();
        }
    }
}
