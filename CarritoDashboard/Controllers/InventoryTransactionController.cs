using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class InventoryTransactionController : Controller
    {
        public IActionResult Index(int? inventoryItemId)
        {
            ViewBag.PageTitle = "Stock Transactions";
            ViewBag.PageSubtitle = "Track inventory stock movements and audit history";
            if (inventoryItemId != null) ViewBag.InventoryItemId = inventoryItemId;

            return View();
        }
    }
}
