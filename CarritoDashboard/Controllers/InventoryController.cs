using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Inventory";
            ViewBag.PageSubtitle = "Manage your invertory";
            return View();
        }
    }
}
