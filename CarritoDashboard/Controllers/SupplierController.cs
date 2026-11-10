using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class SupplierController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Suppliers";
            ViewBag.PageSubtitle = "Manage your inventory suppliers";
            return View();
        }
    }
}
