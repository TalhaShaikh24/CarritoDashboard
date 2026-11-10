using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class PosController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "Point of Sale (POS)";
            ViewBag.PageSubtitle = "Fast, modern retail checkout & order processing";
            return View();
        }
    }
}
