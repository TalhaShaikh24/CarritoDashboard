using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryUnitController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Units";
            ViewBag.PageSubtitle = "Manage your invertory units";
            return View();
        }
    }
}
