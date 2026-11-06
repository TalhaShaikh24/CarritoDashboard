using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryTransactionController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Stock Transactions";
            ViewBag.PageSubtitle = "Track inventory stock movements and audit history";
            return View();
        }
    }
}
