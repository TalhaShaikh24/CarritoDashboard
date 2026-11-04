using Microsoft.AspNetCore.Mvc;

namespace CarritoDashboard.Controllers
{
    public class FaqController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.PageTitle = "FAQs";
            ViewBag.PageSubtitle = "Manage help center questions and answers";
            return View();
        }
    }
}
