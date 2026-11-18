using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class TaxRateController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Tax Rates";
            ViewBag.PageSubtitle = "Manage store tax rates for inventory items";
            return View();
        }
    }
}

