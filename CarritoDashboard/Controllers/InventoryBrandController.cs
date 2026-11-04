using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryBrandController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Brands";
            ViewBag.PageSubtitle = "Manage your invertory brands";
            return View();
        }
    }
}
