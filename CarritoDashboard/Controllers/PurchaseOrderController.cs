using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class PurchaseOrderController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Purchase Orders";
            ViewBag.PageSubtitle = "Manage purchase orders and supplier receiving";
            return View();
        }
    }
}

