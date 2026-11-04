using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class SettlementController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Settlement";
            ViewBag.PageSubtitle = "Manage settlements";
            return View();
        }
    }
}
